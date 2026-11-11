import type { Pool } from 'pg';
import type { Telegraf } from 'telegraf';

import type { Timers } from '@app/timers';

import type { Runtime } from './runtime.js';

export interface ManagedWorker {
    close(): Promise<void>;
    waitUntilReady(): Promise<unknown>;
}
export interface LifecycleDependencies {
    bot: Telegraf;
    pool: Pick<Pool, 'end'>;
    timers: Timers;
}
export interface ApplicationLifecycle {
    attachQueues(queues: Runtime['queues']): void;
    attachWorkers(workers: ManagedWorker[]): void;
    markLaunched(): void;
    installSignals(): void;
    shutdown(signal: string): Promise<void>;
}
