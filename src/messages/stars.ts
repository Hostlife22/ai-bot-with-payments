export const starsMessages = {
    invalidInvoice: 'Счёт недействителен. Создайте новый счёт в магазине.',
    invoiceDescription: (textCount: number, imageCount: number): string =>
        `${textCount} сообщений и ${imageCount} фото.`,
    invoiceTitle: (name: string): string => `Пакет ${name}`,
    paid: '🎉 Оплата прошла успешно! Пакет активирован.',
    price: 'Цена',
} as const;
