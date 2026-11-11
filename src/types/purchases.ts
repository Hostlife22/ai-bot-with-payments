import type { UserId } from '@contracts/user';

export type PaymentProvider = 'stars' | 'platega';
export type Currency = 'XTR' | 'RUB';
export interface PurchaseIntent {
    id: string;
    user_id: string;
    provider: PaymentProvider;
    provider_tx_id: string | null;
    package_name: string;
    text_count: number;
    image_count: number;
    amount: number;
    currency: Currency;
    fulfilled_at: Date | null;
    created_at: Date;
}
export interface NewPurchase {
    id: string;
    userId: UserId;
    provider: PaymentProvider;
    packageName: string;
    textCount: number;
    imageCount: number;
    amount: number;
    currency: Currency;
}
export interface PaymentProof {
    userId: UserId;
    amount: number;
    currency: string;
    transactionId: string;
    provider: PaymentProvider;
}
export interface PurchaseStore {
    create(input: NewPurchase): Promise<PurchaseIntent>;
    bindTransaction(id: string, transactionId: string): Promise<void>;
    find(id: string): Promise<PurchaseIntent | undefined>;
    pending(): Promise<PurchaseIntent[]>;
    cancel(id: string): Promise<void>;
    fulfill(id: string, proof: PaymentProof): Promise<boolean>;
}
