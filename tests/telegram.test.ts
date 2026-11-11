import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Telegraf } from 'telegraf';

import type { User } from '@contracts/user';
import { createCatalog } from '@app/catalog';
import { registerMenuShop } from '@shop/menu';
import { registerCore } from '@telegram/core';

const user: User = {
    telegram_id: '42',
    first_name: null,
    username: null,
    text_balance: 10,
    image_balance: 1,
    is_blocked: false,
    is_premium: false,
    premium_until: null,
    has_purchased: false,
    current_prompt: null,
    roleplay_mode: 'flirt',
    current_discount: 0,
    accepted_terms: true,
    daily_api_cost: '0',
    total_api_cost: '0',
};
function fixture(overrides: Partial<User> = {}) {
    const bot = new Telegraf('test');
    bot.botInfo = {
        id: 1,
        is_bot: true,
        first_name: 'Test bot',
        username: 'test_bot',
        can_join_groups: true,
        can_read_all_group_messages: false,
        supports_inline_queries: false,
    };
    const replies: string[] = [];
    const buttons: string[] = [];
    const answers: string[] = [];
    let writes = 0;
    let reached = false;
    bot.context.answerCbQuery = async (text) => {
        answers.push(text ?? '');
        return true as const;
    };
    bot.context.reply = async (text, extra) => {
        const markup = extra?.reply_markup;
        if (markup && 'inline_keyboard' in markup) {
            buttons.push(...markup.inline_keyboard.flat().map((button) => button.text));
        }
        replies.push(String(text));
        return {
            message_id: 1,
            date: 0,
            chat: { id: 42, type: 'private', first_name: 'Test' },
            text: String(text),
        };
    };
    registerCore({
        bot,
        repository: {
            requireUser: async () => ({ ...user, ...overrides }),
            createUser: async () => {
                writes++;
            },
            updateUserMeta: async () => undefined,
        },
        config: { adminId: 99 },
        sessions: { touchedAt: {} },
    });
    bot.use((_ctx, next) => {
        reached = true;
        return next();
    });
    async function callback(data: string): Promise<void> {
        await bot.handleUpdate({
            update_id: 1,
            callback_query: {
                id: 'query',
                from: { id: 42, is_bot: false, first_name: 'Test' },
                chat_instance: 'chat',
                data,
                message: {
                    message_id: 1,
                    date: 0,
                    chat: { id: 42, type: 'private', first_name: 'Test' },
                    text: 'menu',
                },
            },
        });
    }
    return {
        bot,
        buttons,
        callback,
        replies,
        answers,
        writes: () => writes,
        reached: () => reached,
    };
}
void test('forged admin callback is rejected before database mutations', async () => {
    const app = fixture();
    await app.callback('p_del_1');
    assert.equal(app.reached(), false);
    assert.equal(app.writes(), 0);
    assert.match(app.answers[0] ?? '', /прав/);
});
void test('terms gate blocks shop callbacks until acceptance', async () => {
    const app = fixture({ accepted_terms: false });
    await app.callback('pay_stars_lite');
    assert.equal(app.reached(), false);
    assert.match(app.replies[0] ?? '', /условия/);
});
void test('terms acceptance remains accessible and blocked accounts stay blocked', async () => {
    const app = fixture({ accepted_terms: false });
    await app.callback('tos_accept');
    assert.equal(app.reached(), true);
    const blocked = fixture({ is_blocked: true });
    await blocked.callback('menu_profile');
    assert.equal(blocked.reached(), false);
});

void test('shop prices and labels use configured package quantities and discounts', async () => {
    const app = fixture();
    const settings: Record<string, string> = { pkg_t50: '35_50_73_0', pkg_lite: '65_80_61_7' };
    registerMenuShop({
        bot: app.bot,
        repository: {
            requireUser: async () => ({ ...user, current_discount: 20 }),
            getSetting: async (_key, fallback) => String(fallback),
            setStoreOpened: async () => undefined,
        },
        catalog: createCatalog({
            getSetting: async (key, fallback) => settings[key] ?? String(fallback),
            setSetting: async () => undefined,
        }),
    });
    await app.bot.handleUpdate({
        update_id: 2,
        message: {
            message_id: 1,
            date: 0,
            from: { id: 42, is_bot: false, first_name: 'Test' },
            chat: { id: 42, type: 'private', first_name: 'Test' },
            text: '/buy',
            entities: [{ type: 'bot_command', offset: 0, length: 4 }],
        },
    });
    assert(app.replies.some((text) => text.includes('• 73 шт. — 40₽ | 28⭐️')));
    assert(app.replies.some((text) => text.includes('• Lite (61💬 + 7📸) — 64₽ | 52⭐️')));
    assert(app.buttons.includes('💬 73'));
});
