export const adminBroadcastMessages = {
    mediaPreview: (type: string): string => `[Медиа: ${type}] `,
    missingBroadcast: 'Ошибка: текст рассылки потерян',
    missingText: 'Ошибка: текст не найден',
    previewConfirmation: (btnType: string): string =>
        `\n\nКнопка: ${btnType}\n_Начинаем отправку всем пользователям?_`,
    previewHeading: `🔍 *Предпросмотр рассылки:*\n\n`,
    queued: (length: number): string =>
        `✅ Рассылка запущена в фоновом режиме!\nСообщений в очереди: *${length}*`,
    sendAll: '✅ Отправить всем',
    started: 'Рассылка запущена!',
} as const;
