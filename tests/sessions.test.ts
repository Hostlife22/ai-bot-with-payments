import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSessions, pruneSessions } from '@app/sessions';

void test('session stores are isolated and expiration removes all state for inactive users', () => {
    const sessions = createSessions();
    const other = createSessions();
    sessions.touchedAt.old = 1;
    sessions.touchedAt.active = 99;
    sessions.userState.old = 'WAITING_FOR_PROMOCODE';
    sessions.userState.active = 'WAITING_FOR_CUSTOM_PROMPT';
    sessions.adminPromoDraft.old = {
        code: 'OLD',
        uses: 1,
        textReward: 1,
        imgReward: 0,
        discount: 0,
        newOnly: false,
    };
    sessions.adminBroadcastMsg.old = { type: 'text', text: 'draft', btn: 'none' };
    sessions.lastMessageTime.old = 1;
    sessions.adminTargetUser.old = 42;
    pruneSessions(sessions, 100, 10);
    for (const store of Object.values(sessions)) assert.equal('old' in store, false);
    assert.equal(sessions.userState.active, 'WAITING_FOR_CUSTOM_PROMPT');
    assert.deepEqual(other.userState, {});
});
