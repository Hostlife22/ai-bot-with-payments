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
                            `🎉 Оплата прошла! +${intent.text_count} сообщений, +${intent.image_count} фото.`,
                        )
                        .catch(() => undefined);
            } catch (error) {
                console.error('Payment polling failed', { purchaseId: intent.id, error });
            }
        }
    }
    timers.every(pollPayments, 30000);
}
