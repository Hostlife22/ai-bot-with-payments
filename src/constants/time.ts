export const TIME = {
    secondMs: 1_000,
    minuteMs: 60_000,
    hourMs: 3_600_000,
} as const;

export const SESSION_TIMING = {
    ttlMs: 30 * TIME.minuteMs,
    cleanupIntervalMs: 15 * TIME.minuteMs,
} as const;
