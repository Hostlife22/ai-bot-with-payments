import type { Telegraf } from 'telegraf';

import type { Timers } from '@app/timers';

import type { Repository } from './repositories.js';
import type { Catalog, PaymentService, PlategaClient } from './services.js';

export interface ShopMenuDependencies {
    bot: Telegraf;
    repository: Pick<Repository, 'requireUser' | 'getSetting' | 'setStoreOpened'>;
    catalog: Catalog;
}
export interface StarsShopDependencies {
    bot: Telegraf;
    repository: Pick<Repository, 'requireUser' | 'setUserPrompt'>;
    payments: PaymentService;
}
export interface PlategaShopDependencies {
    bot: Telegraf;
    repository: Pick<Repository, 'requireUser'>;
    platega: PlategaClient;
    payments: PaymentService;
}
export interface PaymentPollingDependencies {
    bot: Telegraf;
    timers: Timers;
    payments: PaymentService;
}
