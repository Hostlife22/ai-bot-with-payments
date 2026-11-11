import { Markup } from 'telegraf';

import { PLATEGA } from '@constants/payments';
import { paymentMessages } from '@messages/platega';
import type { PlategaShopDependencies } from '@contracts/shop';
import { required } from '@domain/validation';

export function registerPlategaShop(runtime: PlategaShopDependencies) {
    const { bot, repository, platega, payments } = runtime;
    const { createPlategaInvoice } = platega;

    bot.action(
        new RegExp(`^pay_platega_(${PLATEGA.methods.sbp}|${PLATEGA.methods.crypto})_([a-z0-9]+)$`),
        async (ctx) => {
            await ctx.answerCbQuery(paymentMessages.creatingPayment);
            const user = await repository.requireUser(ctx.from.id);
            const intent = await payments.create(
                ctx.from.id,
                required(ctx.match[2]),
                'platega',
                user.current_discount,
            );
            const invoice = await createPlategaInvoice(
                intent.amount,
                Number(ctx.match[1]),
                `purchase:${intent.id}`,
            );
            const url = invoice?.redirect ?? invoice?.url ?? invoice?.paymentUrl;
            if (!invoice || !url) {
                await ctx.reply(paymentMessages.providerError);
                return;
            }
            await payments.store.bindTransaction(intent.id, invoice.transactionId);
            await ctx.editMessageText(
                paymentMessages.paymentInstructions(intent.amount),
                Markup.inlineKeyboard([
                    [Markup.button.url(paymentMessages.pay, url)],
                    [Markup.button.callback(paymentMessages.checkStatus, `purchase_${intent.id}`)],
                    [Markup.button.callback(paymentMessages.backToStore, 'trigger_buy')],
                ]),
            );
        },
    );

    bot.action(/^purchase_([a-f0-9-]{36})$/, async (ctx) => {
        await ctx.answerCbQuery(paymentMessages.checkingStatus);
        const intent = await payments.store.find(required(ctx.match[1]));
        if (!intent || intent.user_id !== String(ctx.from.id)) {
            await ctx.reply(paymentMessages.notFound);
            return;
        }
        const status = await payments.checkPlatega(intent);
        await ctx.reply(
            status === 'CONFIRMED'
                ? paymentMessages.packageActivated(intent.text_count, intent.image_count)
                : status === 'ALREADY_PAID'
                  ? paymentMessages.alreadyPaid
                  : status === 'UNAVAILABLE'
                    ? paymentMessages.providerUnavailable
                    : status === 'CANCELED'
                      ? paymentMessages.canceled
                      : paymentMessages.pending,
        );
    });

    bot.action(/^chk_pl_/, (ctx) =>
        ctx.answerCbQuery(paymentMessages.legacyInvoice, {
            show_alert: true,
        }),
    );
}
