export const paymentPollingMessages = {
    confirmed: (textCount: number, imageCount: number): string =>
        `🎉 Оплата прошла! +${textCount} сообщений, +${imageCount} фото.`,
} as const;
