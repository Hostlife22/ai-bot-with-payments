import pg from 'pg';
import { Telegraf } from 'telegraf';

import { SESSION_TIMING } from '@constants/time';
import type { AppConfig } from '@contracts/config';
import { pruneSessions } from '@app/sessions';
import { Timers } from '@app/timers';
import { createRepository } from '@database/repository';
import { registerTelegram } from '@telegram/register';

import { createLifecycle } from './lifecycle.js';
import { createRuntime } from './runtime.js';

export async function startApplication(config: AppConfig): Promise<void> {
    const pool = new pg.Pool({ connectionString: config.databaseUrl });
    const timers = new Timers();
    const bot = new Telegraf(config.botToken);
    const lifecycle = createLifecycle({ bot, pool, timers });
    const repository = createRepository(pool);
    try {
        await repository.initialize();
        const runtime = createRuntime(config, repository, pool, timers, bot);
        lifecycle.attachQueues(runtime.queues);
        registerTelegram(runtime);
        timers.every(() => pruneSessions(runtime.sessions), SESSION_TIMING.cleanupIntervalMs);
        await bot.telegram.getMe();
        const workers = [runtime.queues.startWorker(), runtime.queues.startBroadcastWorker(bot)];
        lifecycle.attachWorkers(workers);
        await Promise.all(workers.map((worker) => worker.waitUntilReady()));
        lifecycle.installSignals();
        lifecycle.markLaunched();
        await bot.launch();
    } catch (error) {
        await lifecycle.shutdown('startup failure');
        throw error;
    }
}
