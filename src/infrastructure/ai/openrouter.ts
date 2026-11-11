import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

import { OPENROUTER } from '@constants/ai';
import { errorMessages } from '@messages/errors';
import type { AiGateway } from '@contracts/ai';
import type { AiResponse } from '@contracts/conversation';

import { parseImageMessage } from './image-schema.js';

export function decodePhoto(value: string): AiResponse['photo'] {
    if (/^https?:\/\//i.test(value)) {
        return value;
    }
    const match = /^data:image\/(?:png|jpe?g|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(value);
    return match?.[1] ? { source: Buffer.from(match[1], 'base64') } : null;
}

function reportedCost(usage: unknown): number | undefined {
    if (
        typeof usage === 'object' &&
        usage !== null &&
        'cost' in usage &&
        typeof usage.cost === 'number' &&
        Number.isFinite(usage.cost) &&
        usage.cost >= 0
    ) {
        return usage.cost;
    }
    return undefined;
}

export function createOpenRouterGateway(apiKey: string): AiGateway {
    const client = new OpenAI({
        baseURL: OPENROUTER.baseUrl,
        apiKey,
        timeout: OPENROUTER.timeoutMs,
        maxRetries: OPENROUTER.maxRetries,
    });
    return {
        async complete(system, history, text) {
            const parameters: ChatCompletionCreateParamsNonStreaming & {
                provider: {
                    order: string[];
                    allow_fallbacks: boolean;
                };
            } = {
                model: OPENROUTER.textModel,
                messages: [
                    { role: 'system', content: system },
                    ...history,
                    { role: 'user', content: text },
                ],
                max_tokens: OPENROUTER.maxCompletionTokens,
                provider: { order: [OPENROUTER.preferredProvider], allow_fallbacks: false },
            };
            const result = await client.chat.completions.create(parameters);
            const content = result.choices[0]?.message.content;
            if (!content) {
                throw new Error(errorMessages.emptyCompletion);
            }
            const usage = result.usage;
            const estimate = usage
                ? (usage.prompt_tokens * OPENROUTER.promptUsdPerMillionTokens +
                      usage.completion_tokens * OPENROUTER.completionUsdPerMillionTokens) /
                  OPENROUTER.tokensPerPricingUnit
                : 0;
            return { text: content, cost: reportedCost(usage) ?? estimate };
        },

        async image(prompt) {
            const result = await client.chat.completions.create({
                model: OPENROUTER.imageModel,
                messages: [{ role: 'user', content: prompt }],
            });
            const message = parseImageMessage(result.choices[0]?.message);
            const first = message.images?.[0];
            const url =
                first?.image_url?.url ??
                first?.url ??
                message.content?.match(
                    /https?:\/\/[^\s)]+|data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/,
                )?.[0];
            return { photo: url ? decodePhoto(url) : null, cost: reportedCost(result.usage) ?? 0 };
        },
    };
}
