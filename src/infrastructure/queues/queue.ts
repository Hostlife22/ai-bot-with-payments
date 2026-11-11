import { Queue, Worker } from 'bullmq';

import type { AiJob } from '@contracts/jobs';
import type { AiQueueDependencies } from '@contracts/queues';

import { redisConnection } from './redis.js';
import { parseAiJob } from './schemas.js';

export function createAiQueue({ redisUrl, repository, ai, deliver }: AiQueueDependencies) {
    const connection = redisConnection(redisUrl);
    const aiQueue = new Queue<AiJob>('ai-requests', {
        connection,
        defaultJobOptions: {
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 1000 },
            attempts: 1,
        },
    });
    aiQueue.on('error', (error) => console.error('AI queue error', error));
    function startWorker() {
        const worker = new Worker<AiJob>(
            'ai-requests',
            async (job) => {
                const data = parseAiJob(job.data);
                let reserved = false;
                try {
                    if (data.shouldDecrement) {
                        reserved = await repository.reserveBalance(data.userId, 'text');
                        if (!reserved) {
                            await deliver(data, {
                                text: '❌ Сообщения закончились. Пополни баланс в магазине.',
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
                    if (reserved) await repository.refundBalance(data.userId, 'text');
                    await deliver(data, {
                        text: '❌ Произошла ошибка генерации ответа. Попробуй позже.',
                        photo: null,
                    }).catch(() => undefined);
                    throw error;
                }
            },
            { connection, concurrency: 5 },
        );
        worker.on('error', (error) => console.error('AI worker error', error));
        worker.on('failed', (job, error) =>
            console.error('AI job failed', { jobId: job?.id, error }),
        );
        return worker;
    }
    return { aiQueue, startWorker };
}
