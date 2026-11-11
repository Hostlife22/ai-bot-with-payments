import { Queue, Worker } from 'bullmq';

import { QUEUES } from '@constants/queues';
import { aiMessages } from '@messages/ai';
import { logMessages } from '@messages/logs';
import type { AiJob } from '@contracts/jobs';
import type { AiQueueDependencies } from '@contracts/queues';

import { redisConnection } from './redis.js';
import { parseAiJob } from './schemas.js';

export function createAiQueue({ redisUrl, repository, ai, deliver }: AiQueueDependencies) {
    const connection = redisConnection(redisUrl);
    const aiQueue = new Queue<AiJob>(QUEUES.aiName, {
        connection,
        defaultJobOptions: {
            removeOnComplete: { count: QUEUES.retainedCompletedJobs },
            removeOnFail: { count: QUEUES.retainedFailedJobs },
            attempts: QUEUES.attempts,
        },
    });
    aiQueue.on('error', (error) => console.error(logMessages.aiQueueFailed, error));

    function startWorker() {
        const worker = new Worker<AiJob>(
            QUEUES.aiName,
            async (job) => {
                const data = parseAiJob(job.data);
                let reserved = false;
                try {
                    if (data.shouldDecrement) {
                        reserved = await repository.reserveBalance(data.userId, 'text');
                        if (!reserved) {
                            await deliver(data, {
                                text: aiMessages.messagesExhausted,
                                photo: null,
                                showBuyButton: true,
                            });
                            return;
                        }
                    }
                    const response = await ai.generateResponse(data.userId, data.text);
                    if (reserved && response.chargeText !== true) {
                        await repository.refundBalance(data.userId, 'text');
                        reserved = false;
                    }
                    await deliver(data, response);
                } catch (error) {
                    if (reserved) {
                        await repository.refundBalance(data.userId, 'text');
                    }
                    await deliver(data, {
                        text: aiMessages.generationFailed,
                        photo: null,
                    }).catch(() => undefined);
                    throw error;
                }
            },
            { connection, concurrency: QUEUES.aiConcurrency },
        );
        worker.on('error', (error) => console.error(logMessages.aiWorkerFailed, error));
        worker.on('failed', (job, error) =>
            console.error(logMessages.aiJobFailed, { jobId: job?.id, error }),
        );
        return worker;
    }

    return { aiQueue, startWorker };
}
