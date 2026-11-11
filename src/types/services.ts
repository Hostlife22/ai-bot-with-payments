import type { PackageData } from './billing.js';
import type { AiResponse } from './conversation.js';
import type { PaymentGateway } from './gateways.js';
import type { PaymentProvider, PurchaseIntent, PurchaseStore } from './purchases.js';
import type { Repository } from './repositories.js';
import type { UserId } from './user.js';

export type AiRepository = Pick<
    Repository,
    | 'requireUser'
    | 'reserveBalance'
    | 'refundBalance'
    | 'addApiCost'
    | 'saveMessage'
    | 'getHistory'
    | 'setUserPrompt'
>;
export interface AiService {
    generateResponse(userId: UserId, text: string): Promise<AiResponse>;
}
export interface Catalog {
    getSafePkg(key: string, defaultValue: string): Promise<string[]>;
    getPackageData(name: string): Promise<PackageData>;
}
export type PaymentCheckStatus =
    'CONFIRMED' | 'ALREADY_PAID' | 'PENDING' | 'UNAVAILABLE' | 'CANCELED';
export interface PaymentService {
    create(
        userId: UserId,
        packageName: string,
        provider: PaymentProvider,
        discount: number,
    ): Promise<PurchaseIntent>;
    checkPlatega(intent: PurchaseIntent): Promise<PaymentCheckStatus>;
    store: PurchaseStore;
}
export type PlategaClient = PaymentGateway;
