import { logMessages } from '@messages/logs';
import type {
    ApplicationLifecycle,
    LifecycleDependencies,
    ManagedWorker,
} from '@contracts/bootstrap';
import type { Runtime } from '@contracts/runtime';

export function createLifecycle({
    bot,
    pool,
    timers,
}: LifecycleDependencies): ApplicationLifecycle {
    let queues: Runtime['queues'] | undefined;
    const workers: ManagedWorker[] = [];
    const activeUpdates = new Set<Promise<void>>();
    let launched = false;
    let closing: Promise<void> | undefined;
    bot.use(async (_ctx, next) => {
        const task = next();
        activeUpdates.add(task);
        try {
            await task;
        } finally {
            activeUpdates.delete(task);
        }
    });
    async function close(signal: string): Promise<void> {
        if (launched) bot.stop(signal);
        await timers.close();
        await Promise.allSettled(activeUpdates);
        const results = await Promise.allSettled(workers.map((worker) => worker.close()));
        for (const result of results)
            if (result.status === 'rejected')
                console.error(logMessages.workerShutdownFailed, result.reason);
        if (queues)
            await Promise.allSettled([queues.aiQueue.close(), queues.broadcastQueue.close()]);
        await pool.end();
    }
    const shutdown = (signal: string): Promise<void> => (closing ??= close(signal));
    return {
        attachQueues(value) {
            queues = value;
        },
        attachWorkers(value) {
            workers.push(...value);
        },
        markLaunched() {
            launched = true;
        },
        shutdown,
        installSignals() {
            for (const signal of ['SIGINT', 'SIGTERM'] as const)
                process.once(signal, () => {
                    void shutdown(signal).catch((error) => {
                        console.error(logMessages.shutdownFailed, error);
                        process.exitCode = 1;
                    });
                });
        },
    };
}
