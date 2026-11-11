import type { AppConfig } from '@contracts/config';
import type { PlategaInvoice, PlategaStatus } from '@contracts/gateways';
import type { Repository } from '@contracts/repositories';

import { parseInvoice, parseStatus } from './schemas.js';

export function createPlategaClient(
    config: AppConfig,
    repository: Pick<Repository, 'logPaymentFailure'>,
) {
    const { logPaymentFailure } = repository;
    const API_URL = 'https://app.platega.io';
    async function createPlategaInvoice(
        amount: number,
        paymentMethod: number,
        payloadStr: string,
    ): Promise<PlategaInvoice | null> {
        if (!config.plategaMerchantId || !config.plategaSecret) return null;
        try {
            const requestBody = {
                paymentMethod: paymentMethod,
                paymentDetails: {
                    amount: amount,
                    currency: 'RUB',
                },
                description: 'Оплата пакета',
                return: 'https://t.me/evaflirt_bot',
                failedUrl: 'https://t.me/evaflirt_bot',
                payload: payloadStr,
            };
            const response = await fetch(`${API_URL}/transaction/process`, {
                method: 'POST',
                signal: AbortSignal.timeout(15000),
                headers: {
                    'X-MerchantId': config.plategaMerchantId,
                    'X-Secret': config.plategaSecret,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                await logPaymentFailure(`Platega invoice request failed: HTTP ${response.status}`);
                return null;
            }
            const data: unknown = await response.json();
            return parseInvoice(data);
        } catch (e) {
            console.error('[Platega] Ошибка сети:', e);
            return null;
        }
    }
    async function checkPlategaInvoice(transactionId: string): Promise<PlategaStatus | null> {
        if (!config.plategaMerchantId || !config.plategaSecret) return null;
        try {
            const response = await fetch(
                `${API_URL}/transaction/${encodeURIComponent(transactionId)}`,
                {
                    method: 'GET',
                    signal: AbortSignal.timeout(15000),
                    headers: {
                        'X-MerchantId': config.plategaMerchantId,
                        'X-Secret': config.plategaSecret,
                    },
                },
            );
            if (!response.ok) {
                console.error(`Platega status request failed: HTTP ${response.status}`);
                return null;
            }
            const data: unknown = await response.json();
            return parseStatus(data);
        } catch (e) {
            console.error('[Platega] Ошибка сети при проверке:', e);
            return null;
        }
    }
    return { createPlategaInvoice, checkPlategaInvoice };
}
