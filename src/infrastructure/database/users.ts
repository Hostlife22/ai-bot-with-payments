import type { Pool } from 'pg';

import type { UserRepository } from '@contracts/repositories';
import type { User, UserId } from '@contracts/user';
import { required } from '@domain/validation';

import { transaction } from './transaction.js';

export function createUserRepository(pool: Pool): UserRepository {
    async function registerReferral(userId: UserId, referrerId: UserId | null): Promise<boolean> {
        return transaction(pool, async (client) => {
            const inserted = await client.query(
                'INSERT INTO users (telegram_id, referred_by) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING telegram_id',
                [userId, referrerId],
            );
            if (!inserted.rowCount || referrerId === null) return false;
            await client.query(
                'UPDATE users SET text_balance = text_balance + 10 WHERE telegram_id = $1',
                [referrerId],
            );
            await client.query(
                'UPDATE users SET text_balance = text_balance + 5 WHERE telegram_id = $1',
                [userId],
            );
            return true;
        });
    }
    async function requireUser(userId: UserId): Promise<User> {
        const user = await getUser(userId);
        if (!user) throw new Error(`User ${userId} does not exist`);
        return user;
    }
    async function getUser(userId: UserId) {
        const safeId = validateUserId(userId);
        const res = await pool.query<User>(
            'SELECT *, CASE WHEN daily_cost_date = CURRENT_DATE THEN daily_api_cost ELSE 0 END AS daily_api_cost FROM users WHERE telegram_id = $1',
            [safeId],
        );
        return res.rows[0];
    }
    async function createUser(userId: UserId, referrerId: UserId | null = null) {
        await pool.query(
            'INSERT INTO users (telegram_id, referred_by) VALUES ($1, $2) ON CONFLICT (telegram_id) DO NOTHING',
            [userId, referrerId],
        );
    }
    async function getReferralsCount(userId: UserId) {
        const res = await pool.query<{
            count: string;
        }>('SELECT COUNT(*) FROM users WHERE referred_by = $1', [userId]);
        return parseInt(required(res.rows[0]).count, 10);
    }
    async function acceptTerms(userId: UserId) {
        await pool.query('UPDATE users SET accepted_terms = TRUE WHERE telegram_id = $1', [userId]);
    }
    async function setBlockStatus(userId: UserId, isBlocked: boolean) {
        await pool.query('UPDATE users SET is_blocked = $1 WHERE telegram_id = $2', [
            isBlocked,
            userId,
        ]);
    }
    async function updateUserMeta(userId: UserId, firstName: string, username: string | undefined) {
        await pool.query('UPDATE users SET first_name = $1, username = $2 WHERE telegram_id = $3', [
            firstName,
            username,
            userId,
        ]);
    }
    async function updateLastActive(userId: UserId) {
        await pool.query('UPDATE users SET last_active_at = NOW() WHERE telegram_id = $1', [
            userId,
        ]);
    }
    function validateUserId(userId: UserId) {
        const id = Number(userId);
        if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Неверный формат Telegram ID');
        return id;
    }
    return {
        registerReferral,
        requireUser,
        getUser,
        createUser,
        getReferralsCount,
        acceptTerms,
        setBlockStatus,
        updateUserMeta,
        updateLastActive,
    };
}
