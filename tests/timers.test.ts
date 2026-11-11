import assert from 'node:assert/strict';
import { test } from 'node:test';

import { required } from '@domain/validation';
import { Timers } from '@app/timers';

void test('shutdown waits for active scheduled work and prevents new tasks', async () => {
    const timers = new Timers();
    let release: (() => void) | undefined;
    let begin: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
        begin = resolve;
    });
    const finish = new Promise<void>((resolve) => {
        release = resolve;
    });
    let done = false;
    timers.after(async () => {
        required(begin)();
        await finish;
        done = true;
    }, 0);
    await started;
    const closing = timers.close();
    assert.equal(done, false);
    required(release)();
    await closing;
    assert.equal(done, true);
    assert.throws(() => timers.every(() => undefined, 1));
});
