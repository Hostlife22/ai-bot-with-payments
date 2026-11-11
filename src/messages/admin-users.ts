import { ADMIN_GIFT_PACKAGES, ADMIN_VIP } from '@constants/users';

export const adminUserMessages = {
    backToAdmin: '🔙 В админ-панель',
    block: '🚫 Заблокировать',
    blocked: 'Пользователь заблокирован',
    blockedStatus: 'Заблокирован',
    cardBlockStatus: (isBlocked: string): string => `🚫 <b>Блокировка:</b> ${isBlocked}`,
    cardHeading: (targetId: string | number): string =>
        `👤 <b>Карточка юзера:</b> <code>${targetId}</code>\n`,
    cardImageBalance: (imageBalance: number): string => `📸 <b>Баланс фото:</b> ${imageBalance}\n`,
    cardName: (nameStr: string, userStr: string): string =>
        `📝 <b>Имя:</b> ${nameStr} (${userStr})\n\n`,
    cardPurchaseStatus: (hasPurchased: string): string =>
        `💎 <b>Статус (Has Purchased):</b> ${hasPurchased}\n`,
    cardTextBalance: (textBalance: number): string =>
        `💬 <b>Баланс сообщений:</b> ${textBalance}\n`,
    editImageBalance: '📸 Ред. Фото',
    editTextBalance: '💬 Ред. Сообщения',
    enterId: '🔍 Отправьте <b>Telegram ID</b> пользователя (только цифры):',
    enterImageBalance: '📸 Введите новое количество фото (число):',
    enterMessage: 'Введите текст сообщения, которое получит этот пользователь:',
    enterTextBalance: '💬 Введите новое количество текстов (число):',
    grantFull: `👑 Full (${ADMIN_GIFT_PACKAGES.full.texts}/${ADMIN_GIFT_PACKAGES.full.images})`,
    grantHard: `🔥 Hard (${ADMIN_GIFT_PACKAGES.hard.texts}/${ADMIN_GIFT_PACKAGES.hard.images})`,
    grantLite: `📦 Lite (${ADMIN_GIFT_PACKAGES.lite.texts}/${ADMIN_GIFT_PACKAGES.lite.images})`,
    grantMedium: `💼 Medium (${ADMIN_GIFT_PACKAGES.medium.texts}/${ADMIN_GIFT_PACKAGES.medium.images})`,
    grantPackage: '📦 Выдать пакет',
    grantVip: '👑 Выдать VIP',
    listHeading: `👥 <b>Список пользователей</b>\nНажмите на пользователя для управления:`,
    messageUser: '✉️ Написать',
    noPayments: 'У пользователя нет платежей.',
    notFound: 'Пользователь не найден.',
    noUsername: 'Нет',
    packageGranted: '✅ Пакет успешно начислен!',
    pagination: (page: number, total: number): string => `${page}/${total}`,
    paymentHistoryEntry: (toLocaleStringruRU: string, amount: number, currency: string): string =>
        `• ${toLocaleStringruRU} - ${amount} ${currency}\n`,
    paymentHistoryHeading: (targetId: number): string =>
        `💳 <b>История платежей (ID: ${targetId}):</b>\n\n`,
    payments: '💳 Платежи',
    searchById: '🔍 Поиск по ID',
    selectPackage: '📦 Выберите пакет для зачисления этому юзеру:',
    unblock: '✅ Разблокировать',
    unblocked: 'Пользователь разблокирован',
    unnamed: 'Без имени',
    userButton: (status: string, id: string, name: string): string =>
        `${status} ID: ${id} | ${name}`,
    username: (name: string): string => `@${name}`,
    vipGranted: `✅ VIP статус успешно выдан (${ADMIN_VIP.texts} текстов, ${ADMIN_VIP.images} фото)!`,
} as const;
