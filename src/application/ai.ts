import type { AiGateway, PhotoSource } from '@contracts/ai';
import type { AiResponse } from '@contracts/conversation';
import type { AiRepository, AiService } from '@contracts/services';
import type { User, UserId } from '@contracts/user';
import { required } from '@domain/validation';

import { imageStyles } from './image-styles.js';
import { promptTemplates } from './prompts.js';
import type { Timers } from './timers.js';

export function createAiService(
    repository: AiRepository,
    gateway: AiGateway,
    photos: PhotoSource,
    timers: Timers,
): AiService {
    const requests = new Map<string, number>();
    timers.every(() => requests.clear(), 60000);
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
        if (user.has_purchased && Number(user.daily_api_cost) >= 1) return null;
        if (!(await repository.reserveBalance(userId, 'image'))) return null;
        let photo: AiResponse['photo'] = null;
        try {
            if (!user.has_purchased) photo = await photos.random();
            else {
                const result = await gateway.image(
                    `High-end editorial photography, artistic and detailed. Subject: ${prompt}`,
                );
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
        if (count >= 10) return failure('⏳ Лимит запросов: 10 в минуту. Подождите немного.');
        requests.set(key, count + 1);
        const user = await repository.requireUser(userId);
        if (
            /отправь голосовое|скажи голосом|голосовое сообщение|хочу услышать твой голос/i.test(
                text,
            )
        )
            return failure('💬 Голосовые сообщения пока недоступны.');
        const history = await repository.getHistory(userId);
        const wantsPhoto =
            /скинь фото|покажи фото|отправь фото|свое фото|покажи себя|фото пж/i.test(text);
        if (wantsPhoto && user.image_balance <= 0)
            return failure('❌ У тебя закончились фото. Выбери пакет в магазине.', true);
        if (wantsPhoto && !user.has_purchased) {
            const photo = await photoFor(userId, user, '');
            if (!photo) return failure('❌ Бесплатные фото пока недоступны.');
            await repository.saveMessage(userId, 'user', text);
            await repository.saveMessage(userId, 'assistant', '[Отправлено фото]');
            return { text: 'Держи... 😈', photo, chargeText: true };
        }
        let system = user.current_prompt;
        if (!system) {
            const mode = history.length >= 6 ? 'flirthot' : 'flirt';
            system = required(promptTemplates[`prompt_${mode}`]);
            if (mode === 'flirthot') await repository.setUserPrompt(userId, system, mode);
        }
        const style = imageStyles[user.roleplay_mode] ?? imageStyles.default;
        const instruction = `\nЕсли пользователь просит фото, вставь [IMAGE: подробное описание на английском]. Визуальный стиль: ${style}.`;
        const result = await gateway.complete(system + instruction, history, text);
        let answer = result.text;
        const imagePrompt =
            /\[IMAGE:([\s\S]*?)\]/i.exec(answer)?.[1] ??
            (wantsPhoto ? 'Beautiful aesthetic portrait, realistic, detailed' : undefined);
        let photo: AiResponse['photo'] = null;
        let showBuyButton = false;
        if (imagePrompt !== undefined) {
            answer = answer.replace(/\[IMAGE:[\s\S]*?\]/gi, '').trim();
            photo = await photoFor(userId, user, imagePrompt);
            if (!photo) {
                showBuyButton = user.image_balance <= 0;
                answer += showBuyButton
                    ? '\n❌ Фото закончились. Пополни баланс в магазине.'
                    : '\n❌ Фото временно недоступно или достигнут дневной лимит.';
            }
        }
        if (result.cost > 0) await repository.addApiCost(userId, result.cost);
        await repository.saveMessage(userId, 'user', text);
        await repository.saveMessage(userId, 'assistant', answer, result.cost);
        return { text: answer || '[Фото]', photo, showBuyButton, chargeText: true };
    }
    return { generateResponse };
}
