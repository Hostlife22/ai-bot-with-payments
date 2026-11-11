import { PAYMENT_POLLING } from '@constants/payments';
import { logMessages } from '@messages/logs';
import { paymentPollingMessages } from '@messages/payment-polling';
import type { PaymentPollingDependencies } from '@contracts/shop';

export function registerPollingShop(runtime: PaymentPollingDependencies) {
    const { bot, timers, payments } = runtime;
    async function pollPayments(): Promise<void> {
        const pending = await payments.store.pending();
        for (const intent of pending) {
            try {
                const status = await payments.checkPlatega(intent);
                if (status === 'CONFIRMED')
                    await bot.telegram
                        .sendMessage(
                            intent.user_id,
                            paymentPollingMessages.confirmed(intent.text_count, intent.image_count),
                        )
                        .catch(() => undefined);
            } catch (error) {
                console.error(logMessages.paymentPollingFailed, { purchaseId: intent.id, error });
            }
        }
    }
    timers.every(pollPayments, PAYMENT_POLLING.intervalMs);
}
