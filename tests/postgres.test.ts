import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import pg from 'pg';

import { PAYMENT_POLLING } from '@constants/payments';
import { createPurchaseStore } from '@database/purchases';
import { createRepository } from '@database/repository';

const url = process.env.TEST_DATABASE_URL;

void describe('PostgreSQL transactions and migrations', { skip: !url }, () => {
    const schema = `test_${randomUUID().replaceAll('-', '')}`;
    const control = new pg.Pool({ connectionString: url });
    const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
    const repository = createRepository(pool);
    const purchases = createPurchaseStore(pool);

    before(async () => {
        await control.query(`CREATE SCHEMA ${schema}`);
        await repository.initialize();
    });

    after(async () => {
        await pool.end();
        await control.query(`DROP SCHEMA ${schema} CASCADE`);
        await control.end();
    });

    beforeEach(async () => {
        await pool.query(
            'TRUNCATE users, messages, payments, purchase_intents, promocodes, user_promocodes RESTART IDENTITY CASCADE',
        );
    });

    void test('migrations run twice without losing user data', async () => {
        await repository.createUser(42);
        await repository.initialize();
        assert.equal((await repository.requireUser(42)).text_balance, 10);
        assert.equal(await repository.getUser(999), undefined);
    });
    void test('concurrent balance reservations never overspend', async () => {
        await repository.createUser(42);
        const attempts = await Promise.all(
            Array.from({ length: 25 }, () => repository.reserveBalance(42, 'text')),
        );
        assert.equal(attempts.filter(Boolean).length, 10);
        assert.equal((await repository.requireUser(42)).text_balance, 0);
    });
    void test('referral bonuses apply only once under duplicate updates', async () => {
        await repository.createUser(41);
        const attempts = await Promise.all(
            Array.from({ length: 10 }, () => repository.registerReferral(42, 41)),
        );
        assert.equal(attempts.filter(Boolean).length, 1);
        assert.equal((await repository.requireUser(41)).text_balance, 20);
        assert.equal((await repository.requireUser(42)).text_balance, 15);
    });
    void test('daily bonus is atomic', async () => {
        await repository.createUser(42);
        const attempts = await Promise.all(
            Array.from({ length: 10 }, () => repository.claimDailyBonus(42)),
        );
        assert.equal(attempts.filter(Boolean).length, 1);
    });
    void test('promocode usage is serialized and respects per-user limits', async () => {
        await repository.createUser(42);
        await repository.createPromocode('ONCE', 10, 5, 0, 20);
        const attempts = await Promise.all(
            Array.from({ length: 10 }, () => repository.activatePromocode(42, 'ONCE')),
        );
        assert.equal(attempts.filter((result) => typeof result === 'object').length, 1);
        assert.equal((await repository.requireUser(42)).text_balance, 15);
    });
    void test('purchase snapshots survive price changes and fulfill once under concurrency', async () => {
        await repository.createUser(42);
        const intent = await purchases.create({
            id: randomUUID(),
            userId: 42,
            provider: 'stars',
            packageName: 'lite',
            textCount: 50,
            imageCount: 5,
            amount: 65,
            currency: 'XTR',
        });
        await repository.setSetting('pkg_lite', '100_150_999_99');
        const proof = {
            userId: 42,
            provider: 'stars' as const,
            amount: 65,
            currency: 'XTR',
            transactionId: 'charge-1',
        };
        const attempts = await Promise.all(
            Array.from({ length: 15 }, () => purchases.fulfill(intent.id, proof)),
        );
        assert.equal(attempts.filter(Boolean).length, 1);
        const user = await repository.requireUser(42);
        assert.equal(user.text_balance, 60);
        assert.equal(user.image_balance, 6);
        assert.equal((await repository.getPaymentHistory(42)).length, 1);
        await assert.rejects(purchases.fulfill(intent.id, { ...proof, userId: 43 }));
    });
    void test('wrong amount rolls back payment and balance changes', async () => {
        await repository.createUser(42);
        const intent = await purchases.create({
            id: randomUUID(),
            userId: 42,
            provider: 'platega',
            packageName: 'lite',
            textCount: 50,
            imageCount: 5,
            amount: 80,
            currency: 'RUB',
        });
        await purchases.bindTransaction(intent.id, 'platega-1');
        await assert.rejects(
            purchases.fulfill(intent.id, {
                userId: 42,
                provider: 'platega',
                amount: 1,
                currency: 'RUB',
                transactionId: 'platega-1',
            }),
        );
        assert.equal((await repository.requireUser(42)).text_balance, 10);
        assert.equal((await repository.getPaymentHistory(42)).length, 0);
    });
    void test('campaign windows and notification flags filter eligible users', async () => {
        for (const id of [42, 43, 44]) {
            await repository.createUser(id);
        }
        await pool.query(`UPDATE users SET
            last_active_at = NOW() - INTERVAL '25 hours',
            store_opened_at = NOW() - INTERVAL '3 hours'
            WHERE telegram_id = 42`);
        await pool.query(`UPDATE users SET
            last_active_at = NOW() - INTERVAL '23 hours',
            store_opened_at = NOW() - INTERVAL '1 hour',
            daily_bonus_claimed_at = NOW() - INTERVAL '12 hours'
            WHERE telegram_id = 43`);
        await pool.query(`UPDATE users SET is_blocked = TRUE,
            last_active_at = NOW() - INTERVAL '49 hours',
            store_opened_at = NOW() - INTERVAL '3 hours'
            WHERE telegram_id = 44`);
        assert.deepEqual(await repository.getUsersForRetargeting24h(), ['42']);
        assert.deepEqual(await repository.getUsersForRetargetingStore(), ['42']);
        assert.deepEqual(await repository.getUsersForBonusNotify(), ['42']);
        await repository.mark24hPromoSent(42);
        await repository.markStorePromoSent(42);
        await repository.markBonusNotified(42);
        assert.deepEqual(await repository.getUsersForRetargeting24h(), []);
        assert.deepEqual(await repository.getUsersForRetargetingStore(), []);
        assert.deepEqual(await repository.getUsersForBonusNotify(), []);
    });
    void test('statistics use the correct time windows and free-balance threshold', async () => {
        await repository.createUser(42);
        await repository.createUser(43);
        await repository.adminSetTextBalance(42, 9);
        await pool.query(
            "UPDATE users SET created_at = NOW() - INTERVAL '10 days' WHERE telegram_id = 43",
        );
        await repository.saveMessage(42, 'assistant', 'Recent response', 0.125);
        await pool.query(`INSERT INTO messages (user_id, role, content, cost, created_at)
            VALUES (42, 'assistant', 'Older response', 0.25, NOW() - INTERVAL '2 hours')`);
        const stats = await repository.getAdminStats();
        assert.equal(Number(stats.users.day), 1);
        assert.equal(Number(stats.users.week), 1);
        assert.equal(Number(stats.users.month), 2);
        assert.equal(Number(stats.users.year), 2);
        assert.equal(Number(stats.funnel.spent_free), 1);
        assert.equal(Number(stats.api_costs_time.min), 0.125);
        assert.equal(Number(stats.api_costs_time.hour), 0.125);
        assert.equal(Number(stats.api_costs_time.day), 0.375);
    });
    void test('recent payment and promotion queries retain their limits', async () => {
        await repository.createUser(42);
        for (let index = 0; index < 12; index++) {
            await repository.grantPackage(42, 1, 0, 1, 'RUB');
            await repository.createPromocode(`RECENT_${index}`, 1, 1, 0, 0);
        }
        assert.equal((await repository.getPaymentHistory(42)).length, 10);
        assert.equal((await repository.getAllPromocodes()).length, 10);
    });
    void test('payment polling bounds batches and prioritizes unchecked active purchases', async () => {
        await repository.createUser(42);
        const intents = await Promise.all(
            Array.from({ length: PAYMENT_POLLING.batchSize + 4 }, async (_, index) => {
                const intent = await purchases.create({
                    id: randomUUID(),
                    userId: 42,
                    provider: 'platega',
                    packageName: 'lite',
                    textCount: 50,
                    imageCount: 5,
                    amount: 80,
                    currency: 'RUB',
                });
                await purchases.bindTransaction(intent.id, `polling-${index}`);
                return intent;
            }),
        );
        const expired = intents[0];
        const canceled = intents[1];
        const paid = intents[2];
        assert(expired && canceled && paid);
        await pool.query(
            "UPDATE purchase_intents SET created_at = NOW() - INTERVAL '8 days' WHERE id = $1",
            [expired.id],
        );
        await purchases.cancel(canceled.id);
        await pool.query('UPDATE purchase_intents SET fulfilled_at = NOW() WHERE id = $1', [
            paid.id,
        ]);
        const batch = await purchases.pending();
        assert.equal(batch.length, PAYMENT_POLLING.batchSize);
        const excluded = new Set([expired.id, canceled.id, paid.id]);
        assert(batch.every((intent) => !excluded.has(intent.id)));
        const checked = new Set(batch.map((intent) => intent.id));
        const next = await purchases.pending();
        assert(next.some((intent) => !checked.has(intent.id)));
    });
    void test('daily API cost resets when accounting date changes', async () => {
        await repository.createUser(42);
        await pool.query(
            'UPDATE users SET daily_api_cost = 5, daily_cost_date = CURRENT_DATE - 1 WHERE telegram_id = 42',
        );
        assert.equal(Number((await repository.requireUser(42)).daily_api_cost), 0);
        await repository.addApiCost(42, 0.1);
        assert.equal(Number((await repository.requireUser(42)).daily_api_cost), 0.1);
    });
});
