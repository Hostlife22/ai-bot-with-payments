import { TIME } from './time.js';

export const AI_LIMITS = {
    requestsPerWindow: 10,
    rateLimitWindowMs: TIME.minuteMs,
    dailyImageBudgetUsd: 1,
    historyMessages: 10,
    hotModeHistoryMessages: 6,
    promptCharacters: 1_000,
    queryCharacters: 1_000,
    userCooldownMs: 5 * TIME.secondMs,
} as const;

export const OPENROUTER = {
    baseUrl: 'https://openrouter.ai/api/v1',
    timeoutMs: 2 * TIME.minuteMs,
    maxRetries: 1,
    textModel: 'deepseek/deepseek-v4-flash',
    imageModel: 'x-ai/grok-imagine-image-quality',
    maxCompletionTokens: 1_024,
    preferredProvider: 'SiliconFlow',
    promptUsdPerMillionTokens: 0.13,
    completionUsdPerMillionTokens: 0.28,
    tokensPerPricingUnit: 1_000_000,
} as const;

export const AI_INTENTS = {
    voice: /отправь голосовое|скажи голосом|голосовое сообщение|хочу услышать твой голос/i,
    photo: /скинь фото|покажи фото|отправь фото|свое фото|покажи себя|фото пж/i,
} as const;
