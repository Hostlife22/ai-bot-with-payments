export const QUEUES = {
    aiName: 'ai-requests',
    broadcastName: 'broadcast',
    retainedCompletedJobs: 1_000,
    retainedFailedJobs: 1_000,
    attempts: 1,
    aiConcurrency: 5,
    broadcastConcurrency: 1,
    broadcastDeliveryDelayMs: 35,
} as const;

export const REDIS_DEFAULTS = {
    port: 6_379,
    ipFamily: 4,
} as const;
