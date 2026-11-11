import { randomUUID } from 'node:crypto';

import type { PaymentGateway } from '@contracts/gateways';
import type { PaymentProvider, PurchaseIntent, PurchaseStore } from '@contracts/purchases';
import type { Catalog, PaymentCheckStatus, PaymentService } from '@contracts/services';
import type { UserId } from '@contracts/user';

import { discountedPrice } from './catalog.js';

export function createPaymentService(
    store: PurchaseStore,
    catalog: Catalog,
    platega: PaymentGateway,
): PaymentService {
    async function create(
        userId: UserId,
        packageName: string,
        provider: PaymentProvider,
        discount: number,
    ): Promise<PurchaseIntent> {
        const pack = await catalog.getPackageData(packageName);
        return store.create({
            id: randomUUID(),
            userId,
            provider,
            packageName,
            textCount: pack.text,
            imageCount: pack.img,
            currency: provider === 'stars' ? 'XTR' : 'RUB',
            amount: discountedPrice(provider === 'stars' ? pack.stars : pack.rub, discount),
        });
    }
    async function checkPlatega(intent: PurchaseIntent): Promise<PaymentCheckStatus> {
        if (intent.provider !== 'platega' || !intent.provider_tx_id)
            throw new Error('Not a Platega purchase');
        const status = await platega.checkPlategaInvoice(intent.provider_tx_id);
        if (!status) return 'UNAVAILABLE';
        if (status.status !== 'CONFIRMED') {
            if (status.status === 'CANCELED' || status.status === 'CHARGEBACKED') {
                await store.cancel(intent.id);
                return 'CANCELED';
            }
            return 'PENDING';
        }
        if (status.payload !== `purchase:${intent.id}`)
            throw new Error('Provider payload mismatch');
        const credited = await store.fulfill(intent.id, {
            userId: intent.user_id,
            provider: 'platega',
            transactionId: intent.provider_tx_id,
            amount: status.paymentDetails.amount,
            currency: status.paymentDetails.currency,
        });
        return credited ? 'CONFIRMED' : 'ALREADY_PAID';
    }
    return { create, checkPlatega, store };
}
