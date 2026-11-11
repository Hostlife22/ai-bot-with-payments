import { AI_INTENTS, AI_LIMITS } from '@constants/ai';
import { aiMessages } from '@messages/ai';
import { imageStyles } from '@messages/image-styles';
import { promptTemplates } from '@messages/prompts';
import type { AiGateway, PhotoSource } from '@contracts/ai';
import type { AiResponse } from '@contracts/conversation';
import type { AiRepository, AiService } from '@contracts/services';
import type { User, UserId } from '@contracts/user';
import { required } from '@domain/validation';

import type { Timers } from './timers.js';

export function createAiService(
    repository: AiRepository,
    gateway: AiGateway,
    photos: PhotoSource,
    timers: Timers,
): AiService {
    const requests = new Map<string, number>();
    timers.every(() => requests.clear(), AI_LIMITS.rateLimitWindowMs);
    const failure = (text: string, showBuyButton = false): AiResponse => ({
        text,
        photo: null,
        showBuyButton,
        chargeText: false,
    });
    async function photoFor(
        userId: UserId,
        user: User,
        prompt: string,
    ): Promise<AiResponse['photo']> {
        if (user.has_purchased && Number(user.daily_api_cost) >= AI_LIMITS.dailyImageBudgetUsd)
            return null;
        if (!(await repository.reserveBalance(userId, 'image'))) return null;
        let photo: AiResponse['photo'] = null;
        try {
            if (!user.has_purchased) photo = await photos.random();
            else {
                const result = await gateway.image(aiMessages.imagePrompt(prompt));
                photo = result.photo;
                if (result.cost > 0) await repository.addApiCost(userId, result.cost);
            }
            return photo;
        } finally {
            if (!photo) await repository.refundBalance(userId, 'image');
        }
    }
    async function generateResponse(userId: UserId, text: string): Promise<AiResponse> {
        const key = String(userId);
        const count = requests.get(key) ?? 0;
        if (count >= AI_LIMITS.requestsPerWindow) return failure(aiMessages.rateLimit);
        requests.set(key, count + 1);
        const user = await repository.requireUser(userId);
        if (AI_INTENTS.voice.test(text)) return failure(aiMessages.voiceUnavailable);
        const history = await repository.getHistory(userId);
        const wantsPhoto = AI_INTENTS.photo.test(text);
        if (wantsPhoto && user.image_balance <= 0) return failure(aiMessages.noImages, true);
        if (wantsPhoto && !user.has_purchased) {
            const photo = await photoFor(userId, user, '');
            if (!photo) return failure(aiMessages.freePhotosUnavailable);
            await repository.saveMessage(userId, 'user', text);
            await repository.saveMessage(userId, 'assistant', aiMessages.photoHistoryEntry);
            return { text: aiMessages.photoCaption, photo, chargeText: true };
        }
        let system = user.current_prompt;
        if (!system) {
            const mode = history.length >= AI_LIMITS.hotModeHistoryMessages ? 'flirthot' : 'flirt';
            system = required(promptTemplates[`prompt_${mode}`]);
            if (mode === 'flirthot') await repository.setUserPrompt(userId, system, mode);
        }
        const style = imageStyles[user.roleplay_mode] ?? imageStyles.default;
        const instruction = aiMessages.photoInstruction(style);
        const result = await gateway.complete(system + instruction, history, text);
        let answer = result.text;
        const imagePrompt =
            /\[IMAGE:([\s\S]*?)\]/i.exec(answer)?.[1] ??
            (wantsPhoto ? aiMessages.defaultImagePrompt : undefined);
        let photo: AiResponse['photo'] = null;
        let showBuyButton = false;
        if (imagePrompt !== undefined) {
            answer = answer.replace(/\[IMAGE:[\s\S]*?\]/gi, '').trim();
            photo = await photoFor(userId, user, imagePrompt);
            if (!photo) {
                showBuyButton = user.image_balance <= 0;
                answer += showBuyButton
                    ? aiMessages.noImagesNotice
                    : aiMessages.photoUnavailableNotice;
            }
        }
        if (result.cost > 0) await repository.addApiCost(userId, result.cost);
        await repository.saveMessage(userId, 'user', text);
        await repository.saveMessage(userId, 'assistant', answer, result.cost);
        return {
            text: answer || aiMessages.photoPlaceholder,
            photo,
            showBuyButton,
            chargeText: true,
        };
    }
    return { generateResponse };
}
