import type { Pool } from 'pg';

import type { BalanceRepository } from '@contracts/repositories';
import type { UserId } from '@contracts/user';
import { nonNegativeInteger } from '@domain/validation';

import { transaction } from './transaction.js';

export function createBalanceRepository(pool: Pool): BalanceRepository {
    async function reserveBalance(userId: UserId, resource: 'text' | 'image'): Promise<boolean> {
        const column = resource === 'text' ? 'text_balance' : 'image_balance';
        const result = await pool.query(
            `UPDATE users SET ${column} = ${column} - 1 WHERE telegram_id = $1 AND ${column} > 0 RETURNING telegram_id`,
            [userId],
        );
        return (result.rowCount ?? 0) > 0;
    }
    async function refundBalance(userId: UserId, resource: 'text' | 'image'): Promise<void> {
        const column = resource === 'text' ? 'text_balance' : 'image_balance';
        await pool.query(`UPDATE users SET ${column} = ${column} + 1 WHERE telegram_id = $1`, [
            userId,
        ]);
    }
    async function resetAllFreeRequests(textCount = 10, imageCount = 1) {
        await pool.query('UPDATE users SET text_balance = $1, image_balance = $2', [
            textCount,
            imageCount,
        ]);
    }
    async function addFreeRequests(userId: UserId, count: number) {
        await pool.query(
            'UPDATE users SET text_balance = GREATEST(text_balance, 0) + $1 WHERE telegram_id = $2',
            [count, userId],
        );
    }
    async function grantPackage(
        userId: UserId,
        textCount: number,
        imageCount: number,
        amount: number,
        currency: string,
    ): Promise<void> {
        nonNegativeInteger(textCount, 'Messages');
        nonNegativeInteger(imageCount, 'Images');
        nonNegativeInteger(amount, 'Amount');
        await transaction(pool, async (client) => {
            await client.query(
                'UPDATE users SET text_balance = GREATEST(text_balance, 0) + $1, image_balance = GREATEST(image_balance, 0) + $2, has_purchased = TRUE, current_discount = 0 WHERE telegram_id = $3',
                [textCount, imageCount, userId],
            );
            await client.query(
                'INSERT INTO payments (user_id, amount, currency) VALUES ($1, $2, $3)',
                [userId, amount, currency],
            );
        });
    }
    async function adminSetTextBalance(userId: UserId, count: number) {
        const safeCount = Number(count);
        if (!Number.isSafeInteger(safeCount) || safeCount < 0) throw new Error('Неверное число');
        await pool.query('UPDATE users SET text_balance = $1 WHERE telegram_id = $2', [
            safeCount,
            userId,
        ]);
    }
    async function adminSetImageBalance(userId: UserId, count: number) {
        const safeCount = Number(count);
        if (!Number.isSafeInteger(safeCount) || safeCount < 0) throw new Error('Неверное число');
        await pool.query('UPDATE users SET image_balance = $1 WHERE telegram_id = $2', [
            safeCount,
            userId,
        ]);
    }
    async function claimDailyBonus(userId: UserId) {
        const res = await pool.query(
            `
        UPDATE users
        SET daily_bonus_claimed_at = NOW(), text_balance = GREATEST(text_balance, 0) + $1, bonus_notified = FALSE
        WHERE telegram_id = $2 AND (daily_bonus_claimed_at IS NULL OR daily_bonus_claimed_at < NOW() - INTERVAL '24 hours')
        RETURNING text_balance
    `,
            [Math.floor(Math.random() * 3) + 1, userId],
        );
        return (res.rowCount ?? 0) > 0;
    }
    return {
        reserveBalance,
        refundBalance,
        resetAllFreeRequests,
        addFreeRequests,
        grantPackage,
        adminSetTextBalance,
        adminSetImageBalance,
        claimDailyBonus,
    };
}
