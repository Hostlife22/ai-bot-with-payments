import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadConfig } from '@config/env';
import { createCatalog, discountedPrice, parsePackage } from '@app/catalog';
import { parseInvoice, parseStatus } from '@payments/schemas';
import { redisConnection } from '@queues/redis';
import { isAdminAction } from '@telegram/core';
import { splitText } from '@telegram/delivery';

void test('package parsing rejects malformed, negative and fractional prices', () => {
    for (const value of [
        '35_50_1',
        '35_-50_10_0',
        '35_50_0_0',
        '0_50_10_0',
        '35_50_1.5_0',
        '35_50x_10_0',
    ])
        assert.throws(() => parsePackage(value));
    assert.deepEqual(parsePackage('35_50_50_0'), { stars: 35, rub: 50, text: 50, img: 0 });
});
void test('catalog rejects invented packages and migrates legacy settings', async () => {
    let saved = '';
    const catalog = createCatalog({
        getSetting: async () => '100_50_5',
        setSetting: async (_key, value) => {
            saved = String(value);
        },
    });
    assert.deepEqual(await catalog.getPackageData('lite'), {
        stars: 100,
        rub: 150,
        text: 50,
        img: 5,
    });
    assert.equal(saved, '100_150_50_5');
    await assert.rejects(catalog.getPackageData('invented'));
});
void test('discounts are bounded and round to at least one unit', () => {
    assert.equal(discountedPrice(50, 20), 40);
    assert.equal(discountedPrice(35, 100), 1);
    for (const discount of [-1, 101, NaN, Infinity])
        assert.throws(() => discountedPrice(50, discount));
});
void test('configuration validates all required inputs before starting services', () => {
    const env = {
        BOT_TOKEN: 'test',
        ADMIN_ID: '42',
        OPENROUTER_API_KEY: 'test',
        DATABASE_URL: 'postgres://localhost/bot',
        REDIS_URL: 'redis://localhost',
    };
    assert.equal(loadConfig(env).adminId, 42);
    assert.throws(() => loadConfig({ ...env, ADMIN_ID: '42x' }));
    assert.throws(() => loadConfig({ ...env, REDIS_URL: '' }));
    assert.throws(() => loadConfig({ ...env, DATABASE_URL: 'https://example.com' }));
});
void test('Redis connection preserves credentials, TLS and database', () => {
    const connection = redisConnection('rediss://worker:pass%21@example.com:6380/2');
    assert.equal('db' in connection && connection.db, 2);
    assert.equal('password' in connection && connection.password, 'pass!');
    assert.deepEqual('tls' in connection && connection.tls, {});
});
void test('provider responses are checked at runtime', () => {
    assert.throws(() => parseInvoice({ transactionId: 12 }));
    assert.throws(() => parseInvoice({ transactionId: 'tx', redirect: 'javascript:alert(1)' }));
    assert.throws(() => parseStatus({ status: 'CONFIRMED' }));
    assert.deepEqual(parseInvoice({ transactionId: 'tx', redirect: 'https://pay.example.com' }), {
        transactionId: 'tx',
        redirect: 'https://pay.example.com',
    });
});
void test('all administrative callback families require authorization', () => {
    for (const data of [
        'p_del_1',
        'p_create',
        'pdraft_save',
        'mu_give_vip',
        'edit_pkg_lite',
        'users_page_1',
        'confirm_broadcast',
        'reset_free_limits',
        'admin_back',
        'toggle_free_mode',
        'start_broadcast',
    ])
        assert.equal(isAdminAction(data), true, data);
    for (const data of ['prompt_flirt', 'menu_profile', 'pay_stars_lite', 'cancel_input'])
        assert.equal(isAdminAction(data), false, data);
});
void test('Telegram text splitting preserves content and surrogate pairs', () => {
    const input = 'a'.repeat(4095) + '😀' + 'b'.repeat(4100);
    const chunks = splitText(input);
    assert.equal(chunks.join(''), input);
    assert.ok(chunks.every((chunk) => chunk.length <= 4096));
    assert.equal(chunks[0]?.length, 4095);
});
