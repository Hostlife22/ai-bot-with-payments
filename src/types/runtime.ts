import type { Telegraf } from 'telegraf';

import type { AppConfig } from '@contracts/config';
import type { Repository } from '@contracts/repositories';
import type { AiService, Catalog, PaymentService, PlategaClient } from '@contracts/services';
import type { Sessions } from '@contracts/sessions';
import type { Timers } from '@app/timers';

import type { QueueResources } from './queues.js';

export interface Runtime {
    bot: Telegraf;
    config: AppConfig;
    repository: Repository;
    platega: PlategaClient;
    payments: PaymentService;
    queues: QueueResources;
    ai: AiService;
    catalog: Catalog;
    timers: Timers;
    sessions: Sessions;
}
