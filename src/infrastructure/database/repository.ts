import type { Pool } from 'pg';

import type { DatabaseRepository } from '@contracts/database';

import { createAdminRepository } from './administration.js';
import { createBalanceRepository } from './balances.js';
import { createCampaignRepository } from './campaigns.js';
import { createConversationRepository } from './conversations.js';
import { migrate } from './migrate.js';
import { createPromotionRepository } from './promotions.js';
import { createSettingsRepository } from './settings.js';
import { createUserRepository } from './users.js';

export function createRepository(pool: Pool): DatabaseRepository {
    return {
        initialize: () => migrate(pool),
        ...createUserRepository(pool),
        ...createConversationRepository(pool),
        ...createBalanceRepository(pool),
        ...createSettingsRepository(pool),
        ...createPromotionRepository(pool),
        ...createCampaignRepository(pool),
        ...createAdminRepository(pool),
    };
}
