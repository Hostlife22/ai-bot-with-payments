import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { QueueEvents } from 'bullmq';

import type { AiResponse } from '@contracts/conversation';
import { createAiQueue } from '@queues/queue';
import { redisConnection } from '@queues/redis';
import { parseAiJob } from '@queues/schemas';

void test('queue input is validated before use', () => {
    assert.throws(() =>
        parseAiJob({ userId: '42x', text: 'Hi', chatId: 42, shouldDecrement: true }),
    );
    assert.throws(() =>
        parseAiJob({ userId: 42, text: 'Hi', chatId: 42, shouldDecrement: 'false' }),
    );
    assert.equal(
        parseAiJob({ userId: '42', text: 'Hi', chatId: 42, shouldDecrement: true }).userId,
        42,
    );
});
const redisUrl = process.env.TEST_REDIS_URL;
void describe('Redis AI queue', { skip: !redisUrl }, () => {
    let balance = 1;
    let mode: 'success' | 'failure' | 'uncharged' = 'success';
    const delivered: AiResponse[] = [];
    const queues = createAiQueue({
        redisUrl: redisUrl ?? 'redis://localhost',
        repository: {
            reserveBalance: async () => {
                if (balance <= 0) return false;
                balance--;
                return true;
            },
            refundBalance: async () => {
                balance++;
            },
        },
        ai: {
            generateResponse: async () => {
                if (mode === 'failure') throw new Error('Provider unavailable');
                return { text: 'OK', photo: null, chargeText: mode !== 'uncharged' };
            },
        },
        deliver: async (_job, response) => {
            delivered.push(response);
        },
    });
    const events = new QueueEvents('ai-requests', {
        connection: redisConnection(redisUrl ?? 'redis://localhost'),
    });
    const worker = queues.startWorker();
    before(async () => {
        await events.waitUntilReady();
        await worker.waitUntilReady();
    });
    beforeEach(async () => {
        balance = 1;
        mode = 'success';
        delivered.length = 0;
    });
    after(async () => {
        await worker.close();
        await queues.aiQueue.obliterate({ force: true });
        await queues.aiQueue.close();
        await events.close();
    });
    void test('successful job debits once and delivers a response', async () => {
        const job = await queues.aiQueue.add('ask-ai', {
            userId: 42,
            text: 'Hi',
            chatId: 42,
            shouldDecrement: true,
        });
        await job.waitUntilFinished(events, 10000);
        assert.equal(balance, 0);
        assert.equal(delivered[0]?.text, 'OK');
    });
    void test('provider error refunds balance and marks job failed', async () => {
        mode = 'failure';
        const job = await queues.aiQueue.add('ask-ai', {
            userId: 42,
            text: 'Hi',
            chatId: 42,
            shouldDecrement: true,
        });
        await assert.rejects(job.waitUntilFinished(events, 10000), /Provider unavailable/);
        assert.equal(balance, 1);
    });
    void test('nonchargeable response refunds the reservation', async () => {
        mode = 'uncharged';
        const job = await queues.aiQueue.add('ask-ai', {
            userId: 42,
            text: 'Hi',
            chatId: 42,
            shouldDecrement: true,
        });
        await job.waitUntilFinished(events, 10000);
        assert.equal(balance, 1);
    });
    void test('exhausted balance never calls AI', async () => {
        balance = 0;
        mode = 'failure';
        const job = await queues.aiQueue.add('ask-ai', {
            userId: 42,
            text: 'Hi',
            chatId: 42,
            shouldDecrement: true,
        });
        await job.waitUntilFinished(events, 10000);
        assert.equal(delivered[0]?.showBuyButton, true);
    });
});
