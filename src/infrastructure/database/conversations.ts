import type { Pool } from 'pg';

import { AI_LIMITS } from '@constants/ai';
import type { HistoryMessage } from '@contracts/conversation';
import type { ConversationRepository } from '@contracts/repositories';
import type { RoleMode, UserId } from '@contracts/user';

export function createConversationRepository(pool: Pool): ConversationRepository {
    async function setUserPrompt(userId: UserId, prompt: string, mode: RoleMode = 'flirt') {
        await pool.query(
            'UPDATE users SET current_prompt = $1, roleplay_mode = $2 WHERE telegram_id = $3',
            [prompt, mode, userId],
        );
    }
    async function saveMessage(
        userId: UserId,
        role: HistoryMessage['role'],
        content: string,
        cost = 0,
    ) {
        await pool.query(
            'INSERT INTO messages (user_id, role, content, cost) VALUES ($1, $2, $3, $4)',
            [userId, role, content, cost],
        );
    }
    async function getHistory(userId: UserId, limit: number = AI_LIMITS.historyMessages) {
        const res = await pool.query<HistoryMessage>(
            'SELECT role, content FROM messages WHERE user_id = $1 ORDER BY id DESC LIMIT $2',
            [userId, limit],
        );
        return res.rows.reverse();
    }
    async function clearHistory(userId: UserId) {
        await pool.query('DELETE FROM messages WHERE user_id = $1', [userId]);
    }
    async function addApiCost(userId: UserId, cost: number) {
        await pool.query(
            'UPDATE users SET total_api_cost = COALESCE(total_api_cost, 0) + $1, daily_api_cost = CASE WHEN daily_cost_date = CURRENT_DATE THEN COALESCE(daily_api_cost, 0) ELSE 0 END + $1, daily_cost_date = CURRENT_DATE WHERE telegram_id = $2',
            [cost, userId],
        );
    }
    return { setUserPrompt, saveMessage, getHistory, clearHistory, addApiCost };
}
