import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Telegraf } from 'telegraf';

import { createLifecycle } from '@bootstrap/lifecycle';
import { required } from '@domain/validation';
import { Timers } from '@app/timers';

void test('concurrent shutdown requests share completion and close database after workers', async () => {
    const events: string[] = [];
    let release: (() => void) | undefined;
    const active = new Promise<void>((resolve) => {
        release = resolve;
    });
    const lifecycle = createLifecycle({
        bot: new Telegraf('test'),
        timers: new Timers(),
        pool: {
            end: async () => {
                events.push('pool');
            },
        },
    });
    lifecycle.attachWorkers([
        {
            waitUntilReady: async () => undefined,
            close: async () => {
                events.push('worker:start');
                await active;
                events.push('worker:closed');
            },
        },
    ]);
    const first = lifecycle.shutdown('SIGTERM');
    const second = lifecycle.shutdown('SIGINT');
    assert.equal(first, second);
    assert.equal(events.includes('pool'), false);
    required(release)();
    await Promise.all([first, second]);
    assert.deepEqual(events, ['worker:start', 'worker:closed', 'pool']);
});
void test('a failed worker cleanup does not prevent database cleanup', async () => {
    const events: string[] = [];
    const lifecycle = createLifecycle({
        bot: new Telegraf('test'),
        timers: new Timers(),
        pool: {
            end: async () => {
                events.push('pool');
            },
        },
    });
    lifecycle.attachWorkers([
        {
            waitUntilReady: async () => undefined,
            close: async () => {
                throw new Error('Test worker failure');
            },
        },
    ]);
    await lifecycle.shutdown('startup failure');
    assert.deepEqual(events, ['pool']);
});
