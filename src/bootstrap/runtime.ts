import { resolve } from 'node:path';

import type { Pool } from 'pg';
import type { Telegraf } from 'telegraf';

import type { AppConfig } from '@contracts/config';
import type { AiResponse } from '@contracts/conversation';
import type { AiJob } from '@contracts/jobs';
import type { Repository } from '@contracts/repositories';
import type { Runtime } from '@contracts/runtime';
import { createAiService } from '@app/ai';
import { createCatalog } from '@app/catalog';
import { createPaymentService } from '@app/payments';
import { createSessions } from '@app/sessions';
import type { Timers } from '@app/timers';
import { createPurchaseStore } from '@database/purchases';
import { createPlategaClient } from '@payments/platega';
import { createLocalPhotoSource } from '@providers/local-photos';
import { createOpenRouterGateway } from '@providers/openrouter';
import { createBroadcastQueue } from '@queues/broadcast';
import { createAiQueue } from '@queues/queue';
import { deliverResponse } from '@telegram/delivery';

export function createRuntime(
    config: AppConfig,
    repository: Repository,
    pool: Pool,
    timers: Timers,
    bot: Telegraf,
): Runtime {
    const ai = createAiService(
        repository,
        createOpenRouterGateway(config.openRouterApiKey),
        createLocalPhotoSource(resolve('src/assets/free_pics')),
        timers,
    );
    const queues = {
        ...createAiQueue({
            redisUrl: config.redisUrl,
            repository,
            ai,
            deliver: (job: AiJob, response: AiResponse) =>
                deliverResponse(bot.telegram, job, response),
        }),
        ...createBroadcastQueue(config.redisUrl),
    };
    const catalog = createCatalog(repository);
    const platega = createPlategaClient(config, repository);
    const payments = createPaymentService(createPurchaseStore(pool), catalog, platega);
    return {
        bot,
        config,
        repository,
        ai,
        queues,
        timers,
        catalog,
        platega,
        payments,
        sessions: createSessions(),
    };
}
