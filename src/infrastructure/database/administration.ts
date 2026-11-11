import type { Pool } from 'pg';

import { DATABASE, STATISTICS_WINDOWS } from '@constants/database';
import { DECIMAL_RADIX } from '@constants/numbers';
import { USER_REWARDS } from '@constants/users';
import type { Payment } from '@contracts/billing';
import type { AdminRepository } from '@contracts/repositories';
import type { AdminStats } from '@contracts/statistics';
import type { User, UserId } from '@contracts/user';
import { required } from '@domain/validation';

export function createAdminRepository(pool: Pool): AdminRepository {
    async function getAdminStats() {
        const usersQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE created_at >= NOW() - $1::interval) as day,
            COUNT(*) FILTER (WHERE created_at >= NOW() - $2::interval) as week,
            COUNT(*) FILTER (WHERE created_at >= NOW() - $3::interval) as month,
            COUNT(*) FILTER (WHERE created_at >= NOW() - $4::interval) as year,
            COUNT(*) as total
        FROM users;
    `;
        const usersRes = await pool.query<AdminStats['users']>(usersQuery, [
            STATISTICS_WINDOWS.day,
            STATISTICS_WINDOWS.week,
            STATISTICS_WINDOWS.month,
            STATISTICS_WINDOWS.year,
        ]);
        const users = required(usersRes.rows[0]);
        const revRes = await pool.query<AdminStats['revenue']>(`
        SELECT 
            COALESCE(SUM(amount) FILTER (WHERE currency = 'XTR'), 0) as stars_total,
            COALESCE(SUM(amount) FILTER (WHERE currency = 'RUB'), 0) as rub_total
        FROM payments;
    `);
        const costRes = await pool.query<{
            api_cost: string;
        }>('SELECT COALESCE(SUM(total_api_cost), 0) as api_cost FROM users');
        const costTimeQuery = `
        SELECT 
            COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - $4::interval), 0) as min,
            COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - $5::interval), 0) as hour,
            COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - $1::interval), 0) as day,
            COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - $2::interval), 0) as week,
            COALESCE(SUM(cost) FILTER (WHERE created_at >= NOW() - $3::interval), 0) as month,
            COALESCE(SUM(cost), 0) as total
        FROM messages;
    `;
        const costTimeRes = await pool.query<AdminStats['api_costs_time']>(costTimeQuery, [
            STATISTICS_WINDOWS.day,
            STATISTICS_WINDOWS.week,
            STATISTICS_WINDOWS.month,
            STATISTICS_WINDOWS.minute,
            STATISTICS_WINDOWS.hour,
        ]);
        const funnelQuery = `
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM users WHERE text_balance < $1) as spent_free,
            (SELECT COUNT(*) FROM users WHERE store_opened_at IS NOT NULL) as store_opened,
            (SELECT COUNT(*) FROM users WHERE has_purchased = TRUE) as paid
    `;
        const funnelRes = await pool.query<AdminStats['funnel']>(funnelQuery, [
            USER_REWARDS.initialTexts,
        ]);
        const funnel = required(funnelRes.rows[0]);
        const api_costs_time = required(costTimeRes.rows[0]);
        const revenue = required(revRes.rows[0]);
        const api_cost = required(costRes.rows[0]).api_cost;
        return { users, funnel, api_costs_time, revenue, api_cost };
    }
    async function getAllUserIds() {
        const res = await pool.query<{
            telegram_id: string;
        }>('SELECT telegram_id FROM users');
        return res.rows.map((row) => row.telegram_id);
    }
    async function getUsersTotal() {
        const res = await pool.query<{
            count: string;
        }>('SELECT COUNT(*) FROM users');
        return parseInt(required(res.rows[0]).count, DECIMAL_RADIX);
    }
    async function getUsersPage(limit: number, offset: number) {
        const res = await pool.query<
            Pick<User, 'telegram_id' | 'first_name' | 'username' | 'is_blocked'>
        >(
            'SELECT telegram_id, first_name, username, is_blocked FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
            [limit, offset],
        );
        return res.rows;
    }
    async function getPaymentHistory(userId: UserId) {
        const res = await pool.query<Payment>(
            'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
            [userId, DATABASE.recentPayments],
        );
        return res.rows;
    }
    async function logPaymentFailure(errorText: string) {
        await pool.query('INSERT INTO payment_failures (error_text) VALUES ($1)', [errorText]);
    }
    return {
        getAdminStats,
        getAllUserIds,
        getUsersTotal,
        getUsersPage,
        getPaymentHistory,
        logPaymentFailure,
    };
}
