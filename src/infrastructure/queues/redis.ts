import type { ConnectionOptions } from 'bullmq';

import { nonNegativeInteger } from '@domain/validation';

export function redisConnection(value: string): ConnectionOptions {
    const url = new URL(value);
    if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('Invalid Redis protocol');
    return {
        host: url.hostname,
        port: url.port ? nonNegativeInteger(url.port, 'Redis port') : 6379,
        family: 4,
        maxRetriesPerRequest: null,
        ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
        ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
        ...(url.pathname.length > 1
            ? { db: nonNegativeInteger(url.pathname.slice(1), 'Redis database') }
            : {}),
        ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
}
