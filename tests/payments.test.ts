import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import type { PaymentProof, PurchaseIntent } from '@contracts/purchases';
import { validatePayment } from '@domain/purchases';

const intent: PurchaseIntent = {
    id: randomUUID(),
    user_id: '42',
    provider: 'stars',
    provider_tx_id: null,
    package_name: 'lite',
    text_count: 50,
    image_count: 5,
    amount: 65,
    currency: 'XTR',
    fulfilled_at: null,
    created_at: new Date(),
};
const proof: PaymentProof = {
    userId: 42,
    amount: 65,
    currency: 'XTR',
    transactionId: 'telegram-charge',
    provider: 'stars',
};
void test('payment proof must match owner, provider, amount, currency and transaction', () => {
    assert.doesNotThrow(() => validatePayment(intent, proof));
    for (const invalid of [
        { userId: 43 },
        { amount: 1 },
        { currency: 'RUB' },
        { provider: 'platega' as const },
        { transactionId: '' },
    ])
        assert.throws(() => validatePayment(intent, { ...proof, ...invalid }));
    assert.throws(() => validatePayment({ ...intent, provider_tx_id: 'another-charge' }, proof));
});
