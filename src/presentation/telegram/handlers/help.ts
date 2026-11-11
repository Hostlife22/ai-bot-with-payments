import { Markup, type Context, type Telegraf } from 'telegraf';
import type { InlineKeyboardMarkup as Keyboard } from 'telegraf/types';

import { commonMessages } from '@messages/common';
import { helpMessages } from '@messages/help';
import type { Repository } from '@contracts/repositories';
import { actorId } from '@telegram/context';

export function setupHelp(bot: Telegraf, repository: Repository) {
    const { getSetting, acceptTerms } = repository;
    bot.hears(commonMessages.help, showHelp);

    bot.action('menu_help', async (ctx) => {
        await ctx.answerCbQuery();
        return showHelp(ctx);
    });

    bot.action('tos_policy', async (ctx) => {
        const text = await getSetting('policy_text', helpMessages.missingPolicy);
        const user = await repository.requireUser(actorId(ctx));
        let kb;
        if (!user || user.accepted_terms === false) {
            kb = [
                [Markup.button.callback(commonMessages.agreement, 'tos_agreement')],
                [Markup.button.callback(helpMessages.accept, 'tos_accept')],
            ];
        } else {
            kb = [[Markup.button.callback(commonMessages.agreement, 'tos_agreement')]];
        }
        await ctx.answerCbQuery();
        return ctx
            .editMessageText(helpMessages.policyPage(text), {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: kb },
            })
            .catch(() => {});
    });

    bot.action('tos_agreement', async (ctx) => {
        const text = await getSetting('agreement_text', helpMessages.missingAgreement);
        const user = await repository.requireUser(actorId(ctx));
        let kb;
        if (!user || user.accepted_terms === false) {
            kb = [
                [Markup.button.callback(commonMessages.policy, 'tos_policy')],
                [Markup.button.callback(helpMessages.accept, 'tos_accept')],
            ];
        } else {
            kb = [[Markup.button.callback(commonMessages.policy, 'tos_policy')]];
        }
        await ctx.answerCbQuery();
        return ctx
            .editMessageText(helpMessages.agreementPage(text), {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: kb },
            })
            .catch(() => {});
    });

    bot.action('tos_accept', async (ctx) => {
        const userId = actorId(ctx);
        await acceptTerms(userId);
        await ctx.answerCbQuery(helpMessages.termsAccepted);
        await ctx.deleteMessage().catch(() => {});
        return ctx.reply(helpMessages.welcome, {
            reply_markup: {
                keyboard: [
                    [{ text: commonMessages.profile }, { text: commonMessages.aiSettings }],
                    [
                        { text: commonMessages.referrals },
                        { text: commonMessages.help },
                        { text: commonMessages.clearHistory },
                    ],
                ],
                resize_keyboard: true,
            },
        });
    });

    async function showHelp(ctx: Context) {
        const faqText = await getSetting('faq_text', helpMessages.emptyFaq, true);
        const supportUrl = await getSetting('support_url', '');
        const msg = helpMessages.helpPage(faqText);
        const kb: Keyboard['inline_keyboard'] = [
            [
                Markup.button.callback(commonMessages.policy, 'tos_policy'),
                Markup.button.callback(commonMessages.agreement, 'tos_agreement'),
            ],
        ];
        if (supportUrl && supportUrl !== ' ' && supportUrl !== '') {
            kb.push([Markup.button.url(helpMessages.contactSupport, supportUrl)]);
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
