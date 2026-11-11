import { FUNNELS } from '@constants/promotions';

export const funnelMessages = {
    bonusReminder: `🎁 *Твой ежедневный бонус готов!*\n\nЗайди в профиль, чтобы забрать бесплатные сообщения.`,
    claimBonus: '👤 Забрать бонус',
    inactiveReminder:
        '🤫 Я приготовила для тебя кое-что особенное, но ты почему-то молчишь... Возвращайся в диалог!',
    storeReminder: (promoCode: string): string =>
        `Вижу, ты заглядывал в магазин 👀\n\n🔥 Я тут договорилась... держи персональный промокод на скидку ${FUNNELS.promoDiscountPercent}% и +${FUNNELS.promoTextReward} бесплатных текстов: <code>${promoCode}</code>\n\nДействует только для тебя, успей использовать!`,
} as const;
