import type { Telegraf } from 'telegraf';

import type { registerAdmin } from '@telegram/admin';
import type { registerCore } from '@telegram/core';

import type { AppConfig } from './config.js';
import type { Repository } from './repositories.js';
import type { Sessions } from './sessions.js';

export type AdminHandlers = ReturnType<typeof registerAdmin>;
export type Core = ReturnType<typeof registerCore>;
export interface CoreDependencies {
    bot: Telegraf;
    repository: Pick<Repository, 'requireUser' | 'createUser' | 'updateUserMeta'>;
    config: Pick<AppConfig, 'adminId'>;
    sessions: Pick<Sessions, 'touchedAt'>;
}
