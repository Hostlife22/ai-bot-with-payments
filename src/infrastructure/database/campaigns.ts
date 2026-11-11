import type { Pool } from 'pg';

import type { CampaignRepository } from '@contracts/repositories';
import type { UserId } from '@contracts/user';

export function createCampaignRepository(pool: Pool): CampaignRepository {
    async function setStoreOpened(userId: UserId) {
        await pool.query('UPDATE users SET store_opened_at = NOW() WHERE telegram_id = $1', [
            userId,
        ]);
    }
    async function getUsersForRetargeting24h() {
        const res = await pool.query<{
            telegram_id: string;
        }>(`
        SELECT telegram_id FROM users
        WHERE last_active_at < NOW() - INTERVAL '24 hours'
        AND last_active_at > NOW() - INTERVAL '48 hours'
        AND has_received_24h_promo = FALSE
        AND is_blocked = FALSE
    `);
        return res.rows.map((r) => r.telegram_id);
    }
    async function mark24hPromoSent(userId: UserId) {
        await pool.query('UPDATE users SET has_received_24h_promo = TRUE WHERE telegram_id = $1', [
            userId,
        ]);
    }
    async function getUsersForRetargetingStore() {
        const res = await pool.query<{
            telegram_id: string;
        }>(`
        SELECT telegram_id FROM users
        WHERE store_opened_at < NOW() - INTERVAL '2 hours'
        AND has_purchased = FALSE
        AND has_received_store_promo = FALSE
        AND is_blocked = FALSE
    `);
        return res.rows.map((r) => r.telegram_id);
    }
    async function markStorePromoSent(userId: UserId) {
        await pool.query(
            'UPDATE users SET has_received_store_promo = TRUE WHERE telegram_id = $1',
            [userId],
        );
    }
    async function getUsersForBonusNotify() {
        const res = await pool.query<{
            telegram_id: string;
        }>(`
        SELECT telegram_id FROM users
        WHERE (daily_bonus_claimed_at < NOW() - INTERVAL '24 hours' OR daily_bonus_claimed_at IS NULL)
        AND bonus_notified = FALSE
        AND is_blocked = FALSE
    `);
        return res.rows.map((r) => r.telegram_id);
    }
    async function markBonusNotified(userId: UserId) {
        await pool.query('UPDATE users SET bonus_notified = TRUE WHERE telegram_id = $1', [userId]);
    }
    return {
        setStoreOpened,
        getUsersForRetargeting24h,
        mark24hPromoSent,
        getUsersForRetargetingStore,
        markStorePromoSent,
        getUsersForBonusNotify,
        markBonusNotified,
    };
}
