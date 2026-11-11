import type { ConnectionOptions } from 'bullmq';

import { REDIS_DEFAULTS } from '@constants/queues';
import { errorMessages } from '@messages/errors';
import { fieldNames } from '@messages/fields';
import { nonNegativeInteger } from '@domain/validation';

export function redisConnection(value: string): ConnectionOptions {
    const url = new URL(value);
    if (!['redis:', 'rediss:'].includes(url.protocol))
        throw new Error(errorMessages.invalidRedisProtocol);
    return {
        host: url.hostname,
        port: url.port ? nonNegativeInteger(url.port, fieldNames.redisPort) : REDIS_DEFAULTS.port,
        family: REDIS_DEFAULTS.ipFamily,
        maxRetriesPerRequest: null,
        ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
        ...(url.pathname.length > 1
            ? { db: nonNegativeInteger(url.pathname.slice(1), fieldNames.redisDatabase) }
            : {}),
        ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
}
