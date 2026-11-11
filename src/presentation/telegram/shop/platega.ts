import { Markup } from 'telegraf';

import type { PlategaShopDependencies } from '@contracts/shop';
import { required } from '@domain/validation';

export function registerPlategaShop(runtime: PlategaShopDependencies) {
    const { bot, repository, platega, payments } = runtime;
    const { createPlategaInvoice } = platega;
    bot.action(/^pay_platega_(2|13)_([a-z0-9]+)$/, async (ctx) => {
        await ctx.answerCbQuery('Создаём платёж...');
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
            await ctx.reply('❌ Платёжная система временно недоступна.');
            return;
        }
        await payments.store.bindTransaction(intent.id, invoice.transactionId);
        await ctx.editMessageText(
            `💳 Оплата: ${intent.amount} ₽. После перевода баланс пополнится автоматически.`,
            Markup.inlineKeyboard([
                [Markup.button.url('💳 Оплатить', url)],
                [Markup.button.callback('📊 Проверить статус', `purchase_${intent.id}`)],
                [Markup.button.callback('⬅️ В магазин', 'trigger_buy')],
            ]),
        );
    });
    bot.action(/^purchase_([a-f0-9-]{36})$/, async (ctx) => {
        await ctx.answerCbQuery('Проверяем статус...');
        const intent = await payments.store.find(required(ctx.match[1]));
        if (!intent || intent.user_id !== String(ctx.from.id)) {
            await ctx.reply('Платёж не найден.');
            return;
        }
        const status = await payments.checkPlatega(intent);
        await ctx.reply(
            status === 'CONFIRMED'
                ? `🎉 Пакет активирован! +${intent.text_count} сообщений, +${intent.image_count} фото.`
                : status === 'ALREADY_PAID'
                  ? '✅ Этот платёж уже зачислен.'
                  : status === 'UNAVAILABLE'
                    ? 'Платёжная система временно недоступна.'
                    : status === 'CANCELED'
                      ? 'Платёж отменён.'
                      : '⏳ Платёж ещё не поступил.',
        );
    });
    bot.action(/^chk_pl_/, (ctx) =>
        ctx.answerCbQuery('Счёт создан до обновления. Для проверки обратитесь в поддержку.', {
            show_alert: true,
        }),
    );
}
