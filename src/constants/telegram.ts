export const TELEGRAM_LIMITS = {
    messageCharacters: 4_096,
    captionCharacters: 1_024,
    minimumChannelIdLength: 3,
} as const;

export const UTF16 = {
    highSurrogateStart: 0xd800,
    highSurrogateEnd: 0xdbff,
} as const;

export const UI_FORMAT = {
    locale: 'ru-RU',
    apiCostDecimals: 4,
    progressSegments: 10,
    fullProgressBalance: 150,
    profileStatusThresholds: { low: 10, medium: 50, high: 150 },
    userNameCharacters: 15,
} as const;
