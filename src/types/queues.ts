import type { Queue, Worker } from 'bullmq';
import type { Telegraf } from 'telegraf';

import type { AiResponse } from './conversation.js';
import type { AiJob, BroadcastJob } from './jobs.js';
import type { Repository } from './repositories.js';
import type { AiService } from './services.js';

export interface AiQueueDependencies {
    redisUrl: string;
    repository: Pick<Repository, 'reserveBalance' | 'refundBalance'>;
    ai: AiService;
    deliver(job: AiJob, response: AiResponse): Promise<void>;
}
export interface QueueResources {
    aiQueue: Queue<AiJob>;
    broadcastQueue: Queue<BroadcastJob>;
    startWorker(): Worker<AiJob>;
    startBroadcastWorker(bot: Telegraf): Worker<BroadcastJob>;
}
