import { Markup, type Context, type Telegraf } from 'telegraf';
import type { InlineKeyboardMarkup as Keyboard } from 'telegraf/types';

import type { Repository } from '@contracts/repositories';
import { actorId } from '@telegram/context';

export function setupHelp(bot: Telegraf, repository: Repository) {
    const { getSetting, acceptTerms } = repository;
    bot.hears('🆘 Помощь', showHelp);
    bot.action('menu_help', async (ctx) => {
        await ctx.answerCbQuery();
        return showHelp(ctx);
    });
    bot.action('tos_policy', async (ctx) => {
        const text = await getSetting('policy_text', '<i>Политика не задана.</i>');
        const user = await repository.requireUser(actorId(ctx));
        let kb;
        if (!user || user.accepted_terms === false) {
            kb = [
                [Markup.button.callback('📄 Соглашение', 'tos_agreement')],
                [Markup.button.callback('✅ Принять', 'tos_accept')],
            ];
        } else {
            kb = [[Markup.button.callback('📄 Соглашение', 'tos_agreement')]];
        }
        await ctx.answerCbQuery();
        return ctx
            .editMessageText(`📜 <b>Политика конфиденциальности</b>\n\n${text}`, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: kb },
            })
            .catch(() => {});
    });
    bot.action('tos_agreement', async (ctx) => {
        const text = await getSetting('agreement_text', '<i>Соглашение не задано.</i>');
        const user = await repository.requireUser(actorId(ctx));
        let kb;
        if (!user || user.accepted_terms === false) {
            kb = [
                [Markup.button.callback('📜 Политика', 'tos_policy')],
                [Markup.button.callback('✅ Принять', 'tos_accept')],
            ];
        } else {
            kb = [[Markup.button.callback('📜 Политика', 'tos_policy')]];
        }
        await ctx.answerCbQuery();
        return ctx
            .editMessageText(`📄 <b>Пользовательское соглашение</b>\n\n${text}`, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: kb },
            })
            .catch(() => {});
    });
    bot.action('tos_accept', async (ctx) => {
        const userId = actorId(ctx);
        await acceptTerms(userId);
        await ctx.answerCbQuery('✅ Условия приняты!');
        await ctx.deleteMessage().catch(() => {});
        return ctx.reply('Добро пожаловать!', {
            reply_markup: {
                keyboard: [
                    [{ text: '👤 Профиль' }, { text: '🧠 Настройка ИИ' }],
                    [
                        { text: '👥 Рефералы' },
                        { text: '🆘 Помощь' },
                        { text: '🧹 Очистить контекст' },
                    ],
                ],
                resize_keyboard: true,
            },
        });
    });
    async function showHelp(ctx: Context) {
        const faqText = await getSetting('faq_text', 'Здесь пока пусто.', true);
        const supportUrl = await getSetting('support_url', '');
        const msg = `🆘 <b>Помощь и Поддержка</b>\n\n<b>FAQ:</b>\n${faqText}`;
        const kb: Keyboard['inline_keyboard'] = [
            [
                Markup.button.callback('📜 Политика', 'tos_policy'),
                Markup.button.callback('📄 Соглашение', 'tos_agreement'),
            ],
        ];
        if (supportUrl && supportUrl !== ' ' && supportUrl !== '') {
            kb.push([Markup.button.url('🎧 Написать в поддержку', supportUrl)]);
        }
        if (ctx.callbackQuery) {
            return ctx
                .editMessageText(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } })
                .catch(() => {});
        } else {
            return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
        }
    }
}
