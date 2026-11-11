import { AI_LIMITS } from '@constants/ai';

export const aiMessages = {
    defaultImagePrompt: 'Beautiful aesthetic portrait, realistic, detailed',
    freePhotosUnavailable: '❌ Бесплатные фото пока недоступны.',
    generationFailed: '❌ Произошла ошибка генерации ответа. Попробуй позже.',
    imagePrompt: (prompt: string): string =>
        `High-end editorial photography, artistic and detailed. Subject: ${prompt}`,
    messagesExhausted: '❌ Сообщения закончились. Пополни баланс в магазине.',
    noImages: '❌ У тебя закончились фото. Выбери пакет в магазине.',
    noImagesNotice: '\n❌ Фото закончились. Пополни баланс в магазине.',
    photoCaption: 'Держи... 😈',
    photoHistoryEntry: '[Отправлено фото]',
    photoInstruction: (style: string): string =>
        `\nЕсли пользователь просит фото, вставь [IMAGE: подробное описание на английском]. Визуальный стиль: ${style}.`,
    photoPlaceholder: '[Фото]',
    photoUnavailableNotice: '\n❌ Фото временно недоступно или достигнут дневной лимит.',
    rateLimit: `⏳ Лимит запросов: ${AI_LIMITS.requestsPerWindow} в минуту. Подождите немного.`,
    voiceUnavailable: '💬 Голосовые сообщения пока недоступны.',
} as const;
