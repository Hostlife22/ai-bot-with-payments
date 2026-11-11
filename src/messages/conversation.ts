export const conversationMessages = {
    broadcastMediaPrompt: `Медиа получено. Хотите добавить кнопку к рассылке? Выберите из меню ниже:`,
    cooldown: (secLeft: number): string =>
        `⏳ *Анти-спам:*\nПожалуйста, подождите ${secLeft} сек. перед следующим запросом.`,
    insufficientMessages: 'У вас закончились сообщения 😔\nВыберите удобный пакет в магазине 💎',
    promoActivated: '✅ *Промокод успешно активирован!*\n',
    promoAlreadyUsed: '❌ Вы уже использовали этот промокод.',
    promoDiscount: (discountAmount: number): string =>
        `\n💰 Скидка на покупку: ${discountAmount} %`,
    promoExhausted: '❌ Количество активаций этого промокода исчерпано.',
    promoImages: (imgReward: number): string => `\n📸 Фото: +${imgReward}`,
    promoInactive: '❌ Этот промокод больше не активен.',
    promoNewUsersOnly:
        '❌ Этот промокод действует только для новых пользователей на первую покупку.',
    promoNotFound: '❌ Промокод не найден.',
    promoTexts: (textReward: number): string => `\n✉️ Сообщений: +${textReward}`,
    promptSaved: `✅ Готово!\n_Свой системный промпт успешно установлен. Контекст диалога очищен._\n\n*Новый режим:*\n🔸 _Свой системный промпт_`,
    promptTooLong: (maxPromptLength: number, length: number): string =>
        `❌ *Слишком длинный текст!*\nМаксимум ${maxPromptLength} символов (у вас ${length}).\n\n_Попробуйте еще раз._`,
    queryTooLong: (maxQueryLength: number, length: number): string =>
        `⚠️ *Ваш запрос слишком длинный!*\nПожалуйста, сократите текст до ${maxQueryLength} символов (сейчас в нем ${length}).\n\n_Большие тексты лучше разбивать на несколько сообщений._`,
    typing: '⏳ _Печатаю ответ..._',
    welcome: 'Привет! Я нейросеть. Воспользуйся меню ниже для настройки и управления профилем 👇',
} as const;
