import type { Pool } from 'pg';

import type {
    NewPurchase,
    PaymentProof,
    PurchaseIntent,
    PurchaseStore,
} from '@contracts/purchases';
import { validatePayment } from '@domain/purchases';
import { required } from '@domain/validation';

import { transaction } from './transaction.js';

export function createPurchaseStore(pool: Pool): PurchaseStore {
    return {
        async create(input: NewPurchase) {
            const result = await pool.query<PurchaseIntent>(
                'INSERT INTO purchase_intents (id, user_id, provider, package_name, text_count, image_count, amount, currency) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
                [
                    input.id,
                    input.userId,
                    input.provider,
                    input.packageName,
                    input.textCount,
                    input.imageCount,
                    input.amount,
                    input.currency,
                ],
            );
            return required(result.rows[0]);
        },
        async bindTransaction(id: string, transactionId: string) {
            const result = await pool.query(
                'UPDATE purchase_intents SET provider_tx_id = $1 WHERE id = $2 AND provider_tx_id IS NULL',
                [transactionId, id],
            );
            if (result.rowCount !== 1)
                throw new Error('Purchase transaction already bound or missing');
        },
        async find(id: string) {
            if (!/^[\da-f-]{36}$/i.test(id)) return undefined;
            const result = await pool.query<PurchaseIntent>(
                'SELECT * FROM purchase_intents WHERE id = $1',
                [id],
            );
            return result.rows[0];
        },
        async pending() {
            const result = await pool.query<PurchaseIntent>(`WITH batch AS (
                SELECT id FROM purchase_intents WHERE provider = 'platega' AND provider_tx_id IS NOT NULL
                AND fulfilled_at IS NULL AND canceled_at IS NULL AND created_at > NOW() - INTERVAL '7 days'
                ORDER BY checked_at NULLS FIRST, created_at LIMIT 100 FOR UPDATE SKIP LOCKED
            ) UPDATE purchase_intents p SET checked_at = NOW() FROM batch WHERE p.id = batch.id RETURNING p.*`);
            return result.rows;
        },
        async cancel(id: string) {
            await pool.query(
                'UPDATE purchase_intents SET canceled_at = NOW() WHERE id = $1 AND fulfilled_at IS NULL',
                [id],
            );
        },
        async fulfill(id: string, proof: PaymentProof) {
            return transaction(pool, async (client) => {
                const result = await client.query<PurchaseIntent>(
                    'SELECT * FROM purchase_intents WHERE id = $1 FOR UPDATE',
                    [id],
                );
                const intent = required(result.rows[0], 'Purchase not found');
                validatePayment(intent, proof);
                if (intent.fulfilled_at) return false;
                const payment = await client.query(
                    'INSERT INTO payments (user_id, amount, currency, tx_id) VALUES ($1,$2,$3,$4) ON CONFLICT (tx_id) DO NOTHING RETURNING id',
                    [
                        intent.user_id,
                        intent.amount,
                        intent.currency,
                        `${proof.provider}:${proof.transactionId}`,
                    ],
                );
                if (!payment.rowCount)
                    throw new Error('Transaction already belongs to another purchase');
                await client.query(
                    'UPDATE users SET text_balance = GREATEST(text_balance,0) + $1, image_balance = GREATEST(image_balance,0) + $2, has_purchased = TRUE, current_discount = 0 WHERE telegram_id = $3',
                    [intent.text_count, intent.image_count, intent.user_id],
                );
                await client.query(
                    'UPDATE purchase_intents SET fulfilled_at = NOW(), provider_tx_id = $1 WHERE id = $2',
                    [proof.transactionId, intent.id],
                );
                await client.query('DELETE FROM messages WHERE user_id = $1', [intent.user_id]);
                return true;
            });
        },
    };
}
