import { TIME } from './time.js';

export const PROMOTIONS = {
    maxCodeCharacters: 255,
    defaultUses: 100,
    defaultTextReward: 10,
    defaultImageReward: 1,
    defaultDiscount: 0,
    defaultUsesPerUser: 1,
} as const;

export const FUNNELS = {
    intervalMs: 5 * TIME.minuteMs,
    deliveryDelayMs: 50,
    inactiveAfterHours: 24,
    inactiveBeforeHours: 48,
    abandonedCartAfterHours: 2,
    codeSuffixRange: 1_000,
    codePrefix: 'SALE20_',
    promoUses: 1,
    promoTextReward: 5,
    promoImageReward: 0,
    promoDiscountPercent: 20,
} as const;
