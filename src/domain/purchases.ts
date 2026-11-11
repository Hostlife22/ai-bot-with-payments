import type { PaymentProof, PurchaseIntent } from '@contracts/purchases';

export function validatePayment(intent: PurchaseIntent, proof: PaymentProof): void {
    if (
        String(proof.userId) !== intent.user_id ||
        proof.amount !== intent.amount ||
        proof.currency !== intent.currency ||
        proof.provider !== intent.provider ||
        !proof.transactionId
    )
        throw new Error('Payment does not match purchase');
    if (intent.provider_tx_id && intent.provider_tx_id !== proof.transactionId)
        throw new Error('Payment transaction mismatch');
}
