import { TIME } from './time.js';

export const PAYMENT_POLLING = {
    intervalMs: 30 * TIME.secondMs,
    batchSize: 100,
    lookbackDays: 7,
} as const;

export const PLATEGA = {
    baseUrl: 'https://app.platega.io',
    timeoutMs: 15 * TIME.secondMs,
    returnUrl: 'https://t.me/evaflirt_bot',
    methods: { sbp: 2, crypto: 13 },
} as const;

export const CURRENCIES = {
    stars: 'XTR',
    rubles: 'RUB',
    admin: 'ADMIN',
    adminVip: 'ADMIN_VIP',
} as const;
