export const paymentMessages = {
    alreadyPaid: '✅ Этот платёж уже зачислен.',
    backToStore: '⬅️ В магазин',
    canceled: 'Платёж отменён.',
    checkingStatus: 'Проверяем статус...',
    checkStatus: '📊 Проверить статус',
    creatingPayment: 'Создаём платёж...',
    invoiceDescription: 'Оплата пакета',
    legacyInvoice: 'Счёт создан до обновления. Для проверки обратитесь в поддержку.',
    notFound: 'Платёж не найден.',
    packageActivated: (textCount: number, imageCount: number): string =>
        `🎉 Пакет активирован! +${textCount} сообщений, +${imageCount} фото.`,
    pay: '💳 Оплатить',
    paymentInstructions: (amount: number): string =>
        `💳 Оплата: ${amount} ₽. После перевода баланс пополнится автоматически.`,
    pending: '⏳ Платёж ещё не поступил.',
    providerError: '❌ Платёжная система временно недоступна.',
    providerUnavailable: 'Платёжная система временно недоступна.',
} as const;
