export const CATALOG = {
    fields: 4,
    legacyFields: 3,
    minimumPrice: 1,
    legacyFallbackRub: '35',
} as const;

export const LEGACY_RUBLE_PRICES: Readonly<Record<string, string>> = {
    '100': '150',
    '200': '300',
    '350': '500',
};
