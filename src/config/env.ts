import type { AppConfig } from '@contracts/config';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const required = (key: string): string => {
        const value = env[key]?.trim();
        if (!value) throw new Error(`Missing required environment variable: ${key}`);
        return value;
    };
    const adminId = Number(required('ADMIN_ID'));
    if (!Number.isSafeInteger(adminId) || adminId <= 0)
        throw new Error('ADMIN_ID must be a positive safe integer');
    const databaseUrl = required('DATABASE_URL');
    const redisUrl = required('REDIS_URL');
    if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol))
        throw new Error('Invalid DATABASE_URL protocol');
    if (!['redis:', 'rediss:'].includes(new URL(redisUrl).protocol))
        throw new Error('Invalid REDIS_URL protocol');
    return {
        botToken: required('BOT_TOKEN'),
        adminId,
        openRouterApiKey: required('OPENROUTER_API_KEY'),
        databaseUrl,
        redisUrl,
        plategaMerchantId: env.PLATEGA_MERCHANT_ID ?? '',
        plategaSecret: env.PLATEGA_SECRET ?? '',
    };
}
