import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { User } from '@contracts/user';
import { createAiService } from '@app/ai';
import { Timers } from '@app/timers';

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

function fixture(overrides: Partial<User> = {}, imageAvailable = false) {
    const events: string[] = [];
    const timers = new Timers();
    const repository: Parameters<typeof createAiService>[0] = {
        requireUser: async () => ({ ...user, ...overrides }),

        reserveBalance: async () => {
            events.push('reserve');
            return true;
        },

        refundBalance: async () => {
            events.push('refund');
        },

        addApiCost: async () => {
            events.push('cost');
        },

        saveMessage: async () => {
            events.push('save');
        },

        getHistory: async () => [],
        setUserPrompt: async () => undefined,
    };
    const gateway = {
        complete: async () => ({ text: 'Привет!', cost: 0.01 }),
        image: async () => ({ photo: null, cost: 0 }),
    };
    return {
        service: createAiService(
            repository,
            gateway,
            { random: async () => (imageAvailable ? 'https://example.com/photo.jpg' : null) },
            timers,
        ),
        timers,
        events,
    };
}

void test('missing local photos refund image balance and do not charge text', async () => {
    const { service, timers, events } = fixture();
    try {
        const result = await service.generateResponse(42, 'покажи фото');
        assert.equal(result.chargeText, false);
        assert.deepEqual(events, ['reserve', 'refund']);
    } finally {
        await timers.close();
    }
});
void test('successful local photos save history and consume a single image', async () => {
    const { service, timers, events } = fixture({}, true);
    try {
        const result = await service.generateResponse(42, 'покажи фото');
        assert.equal(result.chargeText, true);
        assert.ok(result.photo);
        assert.deepEqual(events, ['reserve', 'save', 'save']);
    } finally {
        await timers.close();
    }
});
void test('successful text responses persist cost and history', async () => {
    const { service, timers, events } = fixture();
    try {
        const result = await service.generateResponse(42, 'Привет');
        assert.equal(result.text, 'Привет!');
        assert.equal(result.chargeText, true);
        assert.deepEqual(events, ['cost', 'save', 'save']);
    } finally {
        await timers.close();
    }
});
void test('rate limited responses do not debit resources', async () => {
    const { service, timers } = fixture();
    try {
        for (let index = 0; index < 10; index++) {
            await service.generateResponse(42, 'Привет');
        }
        assert.equal((await service.generateResponse(42, 'Привет')).chargeText, false);
    } finally {
        await timers.close();
    }
});
