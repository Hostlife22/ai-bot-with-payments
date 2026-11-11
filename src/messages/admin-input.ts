import { CATALOG } from '@constants/catalog';

export const adminInputMessages = {
    adminMessage: (text: string): string => `💬 <b>Сообщение от администрации:</b>\n\n${text}`,
    backToPromo: 'Вернуться к промокоду',
    broadcastButtonPrompt: `Хотите добавить кнопку к рассылке? Выберите из меню ниже:`,
    deliveryFailed: '❌ Ошибка доставки (возможно, пользователь заблокировал бота).',
    imageBalanceUpdated: '✅ Количество фото изменено!',
    invalidPackage: `❌ Ошибка! Введите ровно ${CATALOG.fields} числа через пробел (Звезды Рубли Сообщения Фото).\nПример: 25 35 50 5`,
    invalidUserId: '❌ Ошибка: нужно отправить только ID (цифры).',
    messageDelivered: '✅ Сообщение успешно доставлено пользователю!',
    missingDraft: 'Черновик не найден.',
    numberRequired: '❌ Ошибка: введите число.',
    packageUpdated: (pkgType: string): string =>
        `✅ Настройки пакета ${pkgType} успешно обновлены!`,
    positiveNumberRequired: '❌ Введите положительное число.',
    promoUpdated: '✅ Параметр успешно обновлен в базе!',
    saved: `✅ Сохранено!`,
    textBalanceUpdated: '✅ Количество запросов изменено!',
} as const;
