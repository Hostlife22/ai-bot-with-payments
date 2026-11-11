import type { Pool } from 'pg';

import { DATABASE } from '@constants/database';
import { PERCENT } from '@constants/numbers';
import { PROMOTIONS } from '@constants/promotions';
import { errorMessages } from '@messages/errors';
import { fieldNames } from '@messages/fields';
import { logMessages } from '@messages/logs';
import type { Promo, PromoResult } from '@contracts/promotions';
import type { PromotionRepository } from '@contracts/repositories';
import type { UserId } from '@contracts/user';
import { nonNegativeInteger, required, ValidationError } from '@domain/validation';

import { transaction } from './transaction.js';

export function createPromotionRepository(pool: Pool): PromotionRepository {
    async function createPromocode(
        code: string,
        uses_left: number,
        text_reward: number,
        img_reward: number,
        discount_amount: number,
        max_uses_per_user: number = PROMOTIONS.defaultUsesPerUser,
        is_new_users_only = false,
    ) {
        if (!code || code.length > PROMOTIONS.maxCodeCharacters)
            throw new ValidationError(errorMessages.invalidPromocode);
        for (const value of [
            uses_left,
            text_reward,
            img_reward,
            discount_amount,
            max_uses_per_user,
        ])
            nonNegativeInteger(value, fieldNames.promocode);
        if (discount_amount > PERCENT || max_uses_per_user < 1)
            throw new ValidationError(errorMessages.invalidPromoLimits);
        const query = `
        INSERT INTO promocodes (code, uses_left, text_reward, img_reward, discount_amount, max_uses_per_user, max_uses_total, is_new_users_only)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (code) DO UPDATE SET 
            uses_left = EXCLUDED.uses_left,
            text_reward = EXCLUDED.text_reward,
            img_reward = EXCLUDED.img_reward,
            discount_amount = EXCLUDED.discount_amount,
            max_uses_per_user = EXCLUDED.max_uses_per_user,
            max_uses_total = EXCLUDED.max_uses_total,
            is_new_users_only = EXCLUDED.is_new_users_only
    `;
        await pool.query(query, [
            code,
            uses_left,
            text_reward,
            img_reward,
            discount_amount,
            max_uses_per_user,
            uses_left,
            is_new_users_only,
        ]);
    }
    async function updatePromoField(id: number, field: string, value: string | number | boolean) {
        const amount = nonNegativeInteger(value, fieldNames.promocode);
        if (!['text', 'img', 'disc', 'uses'].includes(field))
            throw new ValidationError(errorMessages.unknownPromoField);
        if (field === 'disc' && amount > PERCENT)
            throw new ValidationError(errorMessages.discountTooLarge);
        if (field === 'text')
            await pool.query('UPDATE promocodes SET text_reward = $1 WHERE id = $2', [value, id]);
        if (field === 'img')
            await pool.query('UPDATE promocodes SET img_reward = $1 WHERE id = $2', [value, id]);
        if (field === 'disc')
            await pool.query('UPDATE promocodes SET discount_amount = $1 WHERE id = $2', [
                value,
                id,
            ]);
        if (field === 'uses') {
            await pool.query(
                'UPDATE promocodes SET uses_left = GREATEST(0, uses_left + ($1 - max_uses_total)), max_uses_total = $1 WHERE id = $2',
                [value, id],
            );
        }
    }
    async function activatePromocode(userId: UserId, code: string): Promise<PromoResult> {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const promoRes = await client.query<Promo>(
                'SELECT * FROM promocodes WHERE code = $1 FOR UPDATE',
                [code],
            );
            if (promoRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return 'NOT_FOUND';
            }
            const promo = required(promoRes.rows[0]);
            if (!promo.is_active) {
                await client.query('ROLLBACK');
                return 'INACTIVE';
            }
            if (promo.uses_left <= 0) {
                await client.query('ROLLBACK');
                return 'LIMIT_EXCEEDED';
            }
            if (promo.is_new_users_only) {
                const userRes = await client.query<{
                    has_purchased: boolean;
                }>('SELECT has_purchased FROM users WHERE telegram_id = $1', [userId]);
                if (userRes.rows[0] && userRes.rows[0].has_purchased) {
                    await client.query('ROLLBACK');
                    return 'ONLY_NEW';
                }
            }
            const userPromoRes = await client.query<{
                uses_count: number;
            }>('SELECT uses_count FROM user_promocodes WHERE user_id = $1 AND promo_id = $2', [
                userId,
                promo.id,
            ]);
            let userUses = 0;
            if (userPromoRes.rows.length > 0) {
                userUses = required(userPromoRes.rows[0]).uses_count;
            }
            if (userUses >= promo.max_uses_per_user) {
                await client.query('ROLLBACK');
                return 'ALREADY_USED';
            }
            if (promo.text_reward > 0 || promo.img_reward > 0) {
                await client.query(
                    'UPDATE users SET text_balance = GREATEST(text_balance, 0) + $1, image_balance = GREATEST(image_balance, 0) + $2 WHERE telegram_id = $3',
                    [promo.text_reward, promo.img_reward, userId],
                );
            }
            if (promo.discount_amount > 0) {
                await client.query(
                    'UPDATE users SET current_discount = $1 WHERE telegram_id = $2',
                    [promo.discount_amount, userId],
                );
            }
            await client.query('UPDATE promocodes SET uses_left = uses_left - 1 WHERE id = $1', [
                promo.id,
            ]);
            await client.query(
                'INSERT INTO user_promocodes (user_id, promo_id, uses_count) VALUES ($1, $2, 1) ON CONFLICT (user_id, promo_id) DO UPDATE SET uses_count = user_promocodes.uses_count + 1',
                [userId, promo.id],
            );
            await client.query('COMMIT');
            return promo;
        } catch (e) {
            await client.query('ROLLBACK');
            console.error(logMessages.promoActivationFailed, e);
            throw e;
        } finally {
            client.release();
        }
    }
    async function getAllPromocodes() {
        const res = await pool.query<Promo>(
            'SELECT * FROM promocodes ORDER BY created_at DESC LIMIT $1',
            [DATABASE.recentPromotions],
        );
        return res.rows;
    }
    async function getPromocodeById(id: number) {
        const res = await pool.query<Promo>('SELECT * FROM promocodes WHERE id = $1', [id]);
        return res.rows[0];
    }
    async function togglePromoStatus(id: number) {
        await pool.query('UPDATE promocodes SET is_active = NOT is_active WHERE id = $1', [id]);
    }
    async function togglePromoNewUsersOnly(id: number) {
        await pool.query(
            'UPDATE promocodes SET is_new_users_only = NOT is_new_users_only WHERE id = $1',
            [id],
        );
    }
    async function deletePromocode(id: number) {
        await transaction(pool, async (client) => {
            await client.query('DELETE FROM user_promocodes WHERE promo_id = $1', [id]);
            await client.query('DELETE FROM promocodes WHERE id = $1', [id]);
        });
    }
    return {
        createPromocode,
        updatePromoField,
        activatePromocode,
        getAllPromocodes,
        getPromocodeById,
        togglePromoStatus,
        togglePromoNewUsersOnly,
        deletePromocode,
    };
}
