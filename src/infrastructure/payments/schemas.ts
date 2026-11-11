import { errorMessages } from '@messages/errors';
import type { PlategaInvoice, PlategaStatus } from '@contracts/gateways';
import { record } from '@domain/validation';

export function parseInvoice(value: unknown): PlategaInvoice {
    const data = record(value);
    if (typeof data.transactionId !== 'string' || !data.transactionId) {
        throw new Error(errorMessages.invalidPlategaTransactionId);
    }
    const invoice: PlategaInvoice = { transactionId: data.transactionId };
    for (const key of ['redirect', 'url', 'paymentUrl'] as const) {
        const url = data[key];
        if (typeof url === 'string') {
            if (new URL(url).protocol !== 'https:') {
                throw new Error(errorMessages.paymentUrlMustUseHttps);
            }
            invoice[key] = url;
        }
    }
    return invoice;
}

export function parseStatus(value: unknown): PlategaStatus {
    const data = record(value);
    const details = record(data.paymentDetails);
    if (
        typeof data.status !== 'string' ||
        typeof data.payload !== 'string' ||
        typeof details.amount !== 'number' ||
        typeof details.currency !== 'string'
    ) {
        throw new Error(errorMessages.invalidPlategaStatus);
    }
    return {
        status: data.status,
        payload: data.payload,
        paymentDetails: { amount: details.amount, currency: details.currency },
    };
}
