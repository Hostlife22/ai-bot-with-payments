import { Queue, Worker } from 'bullmq';
import type { Telegraf } from 'telegraf';
import type { InlineKeyboardMarkup as Keyboard } from 'telegraf/types';

import { QUEUES } from '@constants/queues';
import { commonMessages } from '@messages/common';
import { logMessages } from '@messages/logs';
import type { BroadcastJob } from '@contracts/jobs';

import { redisConnection } from './redis.js';

export function createBroadcastQueue(redisUrl: string) {
    const connection = redisConnection(redisUrl);
    const broadcastQueue = new Queue<BroadcastJob>(QUEUES.broadcastName, {
        connection,
        defaultJobOptions: {
            removeOnComplete: { count: QUEUES.retainedCompletedJobs },
            removeOnFail: { count: QUEUES.retainedFailedJobs },
            attempts: QUEUES.attempts,
        },
    });
    broadcastQueue.on('error', (error) => console.error(logMessages.broadcastQueueFailed, error));

    function startBroadcastWorker(bot: Telegraf) {
        const worker = new Worker<BroadcastJob>(
            QUEUES.broadcastName,
            async (job) => {
                const { userId, msgData } = job.data;
                const data = msgData || {
                    type: 'text',
                    text: job.data.messageText ?? '',
                    btn: 'none',
                };
                try {
                    let replyMarkup: Keyboard | undefined;
                    if (data.btn && data.btn !== 'none') {
                        const btnNames: Record<string, string> = {
                            profile: commonMessages.profile,
                            ai: commonMessages.aiSettings,
                            refs: commonMessages.referrals,
                            help: commonMessages.help,
                            store: commonMessages.store,
                        };
                        const cbData: Record<string, string> = {
                            profile: 'menu_profile',
                            ai: 'menu_ai',
                            refs: 'menu_refs',
                            help: 'menu_help',
                            store: 'trigger_buy',
                        };
                        replyMarkup = {
                            inline_keyboard: [
                                [
                                    {
                                        text: btnNames[data.btn] || data.btn,
                                        callback_data: cbData[data.btn] || data.btn,
                                    },
                                ],
                            ],
                        };
                    }
                    if (data.type === 'text') {
                        await bot.telegram.sendMessage(userId, data.text, {
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                        });
                    } else if (data.type === 'photo') {
                        await bot.telegram.sendPhoto(userId, data.file_id, {
                            caption: data.caption,
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                        });
                    } else if (data.type === 'video') {
                        await bot.telegram.sendVideo(userId, data.file_id, {
                            caption: data.caption,
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                        });
                    } else if (data.type === 'document') {
                        await bot.telegram.sendDocument(userId, data.file_id, {
                            caption: data.caption,
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                        });
                    } else if (data.type === 'animation') {
                        await bot.telegram.sendAnimation(userId, data.file_id, {
                            caption: data.caption,
                            parse_mode: 'Markdown',
                            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
                        });
                    }
                    await new Promise((resolve) =>
                        setTimeout(resolve, QUEUES.broadcastDeliveryDelayMs),
                    );
                } catch (error) {
                    console.error(logMessages.broadcastDeliveryFailed, { userId, error });
                }
            },
            {
                connection,
                concurrency: QUEUES.broadcastConcurrency,
            },
        );
        worker.on('error', (error) => console.error(logMessages.broadcastWorkerFailed, error));
        return worker;
    }

    return { broadcastQueue, startBroadcastWorker };
}
