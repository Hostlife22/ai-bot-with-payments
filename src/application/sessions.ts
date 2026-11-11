import { SESSION_TIMING } from '@constants/time';
import type { Sessions } from '@contracts/sessions';

export function createSessions(): Sessions {
    return {
        userState: {},
        adminPromoDraft: {},
        adminBroadcastMsg: {},
        lastMessageTime: {},
        adminTargetUser: {},
        touchedAt: {},
    };
}
export function pruneSessions(
    sessions: Sessions,
    now = Date.now(),
    ttl: number = SESSION_TIMING.ttlMs,
): void {
    for (const [id, touched] of Object.entries(sessions.touchedAt)) {
        if (touched === undefined || now - touched <= ttl) continue;
        delete sessions.touchedAt[id];
        delete sessions.lastMessageTime[id];
        delete sessions.userState[id];
        delete sessions.adminPromoDraft[id];
        delete sessions.adminBroadcastMsg[id];
        delete sessions.adminTargetUser[id];
    }
}
