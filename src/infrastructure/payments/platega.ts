import { CURRENCIES, PLATEGA } from '@constants/payments';
import { logMessages } from '@messages/logs';
import { paymentMessages } from '@messages/platega';
import type { AppConfig } from '@contracts/config';
import type { PlategaInvoice, PlategaStatus } from '@contracts/gateways';
import type { Repository } from '@contracts/repositories';

import { parseInvoice, parseStatus } from './schemas.js';

export function createPlategaClient(
    config: AppConfig,
    repository: Pick<Repository, 'logPaymentFailure'>,
) {
    const { logPaymentFailure } = repository;

    async function createPlategaInvoice(
        amount: number,
        paymentMethod: number,
        payloadStr: string,
    ): Promise<PlategaInvoice | null> {
        if (!config.plategaMerchantId || !config.plategaSecret) {
            return null;
        }
        try {
            const requestBody = {
                paymentMethod: paymentMethod,
                paymentDetails: {
                    amount: amount,
                    currency: CURRENCIES.rubles,
                },
                description: paymentMessages.invoiceDescription,
                return: PLATEGA.returnUrl,
                failedUrl: PLATEGA.returnUrl,
                payload: payloadStr,
            };
            const response = await fetch(`${PLATEGA.baseUrl}/transaction/process`, {
                method: 'POST',
                signal: AbortSignal.timeout(PLATEGA.timeoutMs),
                headers: {
                    'X-MerchantId': config.plategaMerchantId,
                    'X-Secret': config.plategaSecret,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                await logPaymentFailure(logMessages.plategaInvoiceHttpFailure(response.status));
                return null;
            }
            const data: unknown = await response.json();
            return parseInvoice(data);
        } catch (e) {
            console.error(logMessages.plategaNetworkFailed, e);
            return null;
        }
    }

    async function checkPlategaInvoice(transactionId: string): Promise<PlategaStatus | null> {
        if (!config.plategaMerchantId || !config.plategaSecret) {
            return null;
        }
        try {
            const response = await fetch(
                `${PLATEGA.baseUrl}/transaction/${encodeURIComponent(transactionId)}`,
                {
                    method: 'GET',
                    signal: AbortSignal.timeout(PLATEGA.timeoutMs),
                    headers: {
                        'X-MerchantId': config.plategaMerchantId,
                        'X-Secret': config.plategaSecret,
                    },
                },
            );
            if (!response.ok) {
                console.error(logMessages.plategaStatusHttpFailure(response.status));
                return null;
            }
            const data: unknown = await response.json();
            return parseStatus(data);
        } catch (e) {
            console.error(logMessages.plategaStatusNetworkFailed, e);
            return null;
        }
    }

    return { createPlategaInvoice, checkPlategaInvoice };
}
