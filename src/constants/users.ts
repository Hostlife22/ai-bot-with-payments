import { DEFAULT_PACKAGES } from './packages.js';

export const USER_REWARDS = {
    initialTexts: 10,
    initialImages: 1,
    referrerTexts: 10,
    inviteeTexts: 5,
    dailyBonusMin: 1,
    dailyBonusMax: 3,
    dailyBonusCooldownHours: 24,
} as const;

export const ADMIN_VIP = { texts: 99_999, images: 9_999 } as const;

export const ADMIN_GIFT_PACKAGES = {
    lite: { texts: DEFAULT_PACKAGES.lite.text, images: DEFAULT_PACKAGES.lite.img },
    medium: { texts: DEFAULT_PACKAGES.medium.text, images: DEFAULT_PACKAGES.medium.img },
    hard: { texts: DEFAULT_PACKAGES.hard.text, images: DEFAULT_PACKAGES.hard.img },
    full: { texts: DEFAULT_PACKAGES.full.text, images: DEFAULT_PACKAGES.full.img },
} as const;
