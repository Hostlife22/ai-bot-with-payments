import type { StarsShopDependencies } from '@contracts/shop';
import { validatePayment } from '@domain/purchases';
import { required } from '@domain/validation';
import { promptTemplates } from '@app/prompts';

export function registerStarsShop(runtime: StarsShopDependencies) {
    const { bot, repository, payments } = runtime;
    bot.action(/^pay_stars_([a-z0-9]+)$/, async (ctx) => {
        await ctx.answerCbQuery();
        const name = required(ctx.match[1]);
        const user = await repository.requireUser(ctx.from.id);
        const intent = await payments.create(ctx.from.id, name, 'stars', user.current_discount);
        await ctx.replyWithInvoice({
            title: `Пакет ${name.toUpperCase()}`,
            description: `${intent.text_count} сообщений и ${intent.image_count} фото.`,
            payload: `purchase:${intent.id}`,
            provider_token: '',
            currency: 'XTR',
            prices: [{ label: 'Цена', amount: intent.amount }],
        });
    });
    bot.on('pre_checkout_query', async (ctx) => {
        const query = ctx.preCheckoutQuery;
        try {
            const id = query.invoice_payload.replace(/^purchase:/, '');
            const intent = required(await payments.store.find(id));
            validatePayment(intent, {
                userId: ctx.from.id,
                amount: query.total_amount,
                currency: query.currency,
                provider: 'stars',
                transactionId: query.id,
            });
            if (intent.fulfilled_at) throw new Error('Already paid');
            await ctx.answerPreCheckoutQuery(true);
        } catch {
            await ctx.answerPreCheckoutQuery(
                false,
                'Счёт недействителен. Создайте новый счёт в магазине.',
            );
        }
    });
    bot.on('successful_payment', async (ctx) => {
        const payment = ctx.message.successful_payment;
        const id = payment.invoice_payload.replace(/^purchase:/, '');
        const credited = await payments.store.fulfill(id, {
            userId: ctx.from.id,
            provider: 'stars',
            amount: payment.total_amount,
            currency: payment.currency,
            transactionId: payment.telegram_payment_charge_id,
        });
        if (credited) {
            const user = await repository.requireUser(ctx.from.id);
            if (!user.current_prompt || user.current_prompt === promptTemplates.prompt_flirt)
                await repository.setUserPrompt(
                    ctx.from.id,
                    required(promptTemplates.prompt_default),
                    'default',
                );
            await ctx.reply('🎉 Оплата прошла успешно! Пакет активирован.');
        }
    });
}
