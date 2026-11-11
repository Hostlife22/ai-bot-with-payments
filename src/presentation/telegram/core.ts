import { Markup, type Context } from 'telegraf';

import { commonMessages } from '@messages/common';
import { coreMessages } from '@messages/core';
import type { CoreDependencies } from '@contracts/telegram';
import type { UserId } from '@contracts/user';

export const isAdminAction = (data: string): boolean =>
    /^(?:admin_|p_|pdraft_|mu_|broadcast_btn_|edit_|users_page_|confirm_broadcast$|reset_free_limits$|toggle_free_mode$|start_broadcast$)/.test(
        data,
    );

export function registerCore({ bot, repository, config, sessions }: CoreDependencies) {
    function getMainKeyboard(userId: UserId) {
        const keyboard: string[][] = [
            [commonMessages.profile, commonMessages.aiSettings],
            [commonMessages.referrals, commonMessages.help],
            [commonMessages.clearHistory],
        ];
        if (Number(userId) === config.adminId) {
            keyboard.push([commonMessages.adminPanel]);
        }
        return Markup.keyboard(keyboard).resize();
    }

    async function requireTerms(ctx: Context, userId: UserId): Promise<boolean> {
        const user = await repository.requireUser(userId);
        if (Number(userId) === config.adminId || user.accepted_terms) {
            return true;
        }
        await ctx.reply(
            coreMessages.termsRequired,
            Markup.inlineKeyboard([
                [Markup.button.callback(coreMessages.policy, 'tos_policy')],
                [Markup.button.callback(coreMessages.agreement, 'tos_agreement')],
                [Markup.button.callback(coreMessages.acceptTerms, 'tos_accept')],
            ]),
        );
        return false;
    }

    bot.use(async (ctx, next) => {
        if (!ctx.from || ctx.from.is_bot) {
            return;
        }
        const userId = ctx.from.id;
        sessions.touchedAt[String(userId)] = Date.now();
        if (ctx.preCheckoutQuery || (ctx.message && 'successful_payment' in ctx.message)) {
            return next();
        }
        const data =
            ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
        if (data && isAdminAction(data) && userId !== config.adminId) {
            await ctx.answerCbQuery(coreMessages.forbidden, { show_alert: true });
            return;
        }
        if (
            ctx.message &&
            'text' in ctx.message &&
            /^\/start(?:@\w+)?(?:\s|$)/.test(ctx.message.text)
        ) {
            return next();
        }
        await repository.createUser(userId);
        const user = await repository.requireUser(userId);
        await repository.updateUserMeta(userId, ctx.from.first_name, ctx.from.username);
        if (user.is_blocked && userId !== config.adminId) {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery(coreMessages.blockedCallback, { show_alert: true });
            } else {
                await ctx.reply(commonMessages.accountBlocked);
            }
            return;
        }
        const termsAction = data && ['tos_policy', 'tos_agreement', 'tos_accept'].includes(data);
        if (!termsAction && !(await requireTerms(ctx, userId))) {
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery(coreMessages.acceptTermsFirst);
            }
            return;
        }
        return next();
    });

    return { getMainKeyboard, requireTerms };
}
