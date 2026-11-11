import { Markup, type Context } from 'telegraf';

import { PERCENT } from '@constants/numbers';
import { UI_FORMAT } from '@constants/telegram';
import { USER_REWARDS } from '@constants/users';
import { adminSettingsMessages } from '@messages/admin-settings';
import { commonMessages } from '@messages/common';
import type { Runtime } from '@contracts/runtime';
import { actorId } from '@telegram/context';

export function registerSettings(runtime: Runtime) {
    const { bot, repository, config, sessions } = runtime;
    const ADMIN_ID = config.adminId;
    const { userState } = sessions;
    const { isFreeModeEnabled, toggleFreeMode, resetAllFreeRequests, getAdminStats } = repository;
    async function renderAdminPanel(ctx: Context, isEdit = false) {
        const stats = await getAdminStats();
        const freeMode = await isFreeModeEnabled();
        const f = stats.funnel || { total_users: 1, spent_free: 0, store_opened: 0, paid: 0 };
        const total = parseInt(f.total_users) || 1;
        const spent = parseInt(f.spent_free) || 0;
        const opened = parseInt(f.store_opened) || 0;
        const paid = parseInt(f.paid) || 0;
        const pSpent = Math.round((spent / total) * PERCENT);
        const pOpened = Math.round((opened / total) * PERCENT);
        const pPaid = Math.round((paid / total) * PERCENT);
        const message =
            adminSettingsMessages.heading +
            adminSettingsMessages.usersHeading +
            adminSettingsMessages.usersDay(stats.users.day) +
            adminSettingsMessages.usersWeek(stats.users.week) +
            adminSettingsMessages.usersTotal(stats.users.total) +
            adminSettingsMessages.financesHeading +
            adminSettingsMessages.revenue(
                stats.revenue.rub_total || 0,
                stats.revenue.stars_total || 0,
            ) +
            adminSettingsMessages.apiCost(
                Number(stats.api_costs_time.total || 0).toFixed(UI_FORMAT.apiCostDecimals),
            ) +
            adminSettingsMessages.funnelHeading +
            adminSettingsMessages.funnelTotal(total) +
            adminSettingsMessages.funnelSpent(spent, pSpent) +
            adminSettingsMessages.funnelOpened(opened, pOpened) +
            adminSettingsMessages.funnelPaid(paid, pPaid) +
            adminSettingsMessages.modeSummary(
                freeMode
                    ? adminSettingsMessages.freeModeStatus
                    : adminSettingsMessages.limitedModeStatus,
            );
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback(adminSettingsMessages.broadcast, 'start_broadcast'),
                Markup.button.callback(adminSettingsMessages.promotions, 'admin_promo_list'),
            ],
            [
                Markup.button.callback(adminSettingsMessages.allUsers, 'users_page_1'),
                Markup.button.callback(adminSettingsMessages.findUser, 'mu_start'),
            ],
            [
                Markup.button.callback(adminSettingsMessages.prices, 'admin_edit_pkgs'),
                Markup.button.callback(adminSettingsMessages.texts, 'edit_texts_menu'),
            ],
            [Markup.button.callback(adminSettingsMessages.starsUrl, 'edit_stars_url')],
            [Markup.button.callback(adminSettingsMessages.resetLimits, 'reset_free_limits')],
            [
                Markup.button.callback(
                    freeMode
                        ? adminSettingsMessages.enableLimits
                        : adminSettingsMessages.enableFreeMode,
                    'toggle_free_mode',
                ),
            ],
        ]);
        if (isEdit) {
            return ctx
                .editMessageText(message, {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard.reply_markup,
                })
                .catch(() => ({}));
        }
        return ctx.replyWithMarkdown(message, keyboard);
    }
    bot.command('admin', (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        delete userState[actorId(ctx)];
        return renderAdminPanel(ctx, false);
    });
    bot.action('toggle_free_mode', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const currentStatus = await isFreeModeEnabled();
        await toggleFreeMode(!currentStatus);
        await ctx.answerCbQuery(
            adminSettingsMessages.freeModeChanged(
                !currentStatus ? adminSettingsMessages.enabled : adminSettingsMessages.disabled,
            ),
        );
        return renderAdminPanel(ctx, true);
    });
    bot.action('admin_back', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        return renderAdminPanel(ctx, true);
    });
    bot.action('edit_texts_menu', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback(commonMessages.policy, 'edit_policy'),
                Markup.button.callback(adminSettingsMessages.editAgreement, 'edit_agreement'),
            ],
            [Markup.button.callback(adminSettingsMessages.faq, 'edit_faq')],
            [Markup.button.callback(adminSettingsMessages.supportUrl, 'edit_support')],
            [
                Markup.button.callback(
                    adminSettingsMessages.bonusChannelId,
                    'edit_bonus_channel_id',
                ),
                Markup.button.callback(
                    adminSettingsMessages.bonusChannelUrl,
                    'edit_bonus_channel_url',
                ),
            ],
            [Markup.button.callback(commonMessages.back, 'admin_back')],
        ]);
        const msg =
            adminSettingsMessages.textSettingsHeading +
            adminSettingsMessages.htmlInstructions +
            adminSettingsMessages.htmlBoldExample +
            adminSettingsMessages.htmlItalicExample +
            adminSettingsMessages.htmlLinkExample +
            adminSettingsMessages.channelInstructionsHeading +
            adminSettingsMessages.channelIdInstructions +
            adminSettingsMessages.channelUrlInstructions;
        return ctx.editMessageText(msg, { parse_mode: 'HTML', ...kb });
    });
    const adminWaitActions = [
        'edit_stars_url',
        'edit_policy',
        'edit_agreement',
        'edit_faq',
        'edit_support',
        'edit_bonus_channel_id',
        'edit_bonus_channel_url',
    ] as const;
    adminWaitActions.forEach((action) => {
        bot.action(action, async (ctx) => {
            if (actorId(ctx) !== ADMIN_ID) return;
            userState[actorId(ctx)] = `WAITING_EDIT_${action.slice('edit_'.length).toUpperCase()}`;
            await ctx.answerCbQuery();
            return ctx.editMessageText(adminSettingsMessages.enterSetting, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: commonMessages.cancel, callback_data: 'cancel_input' }],
                    ],
                },
            });
        });
    });
    bot.action('cancel_input', async (ctx) => {
        delete userState[actorId(ctx)];
        await ctx.answerCbQuery(adminSettingsMessages.canceled);
        await ctx.deleteMessage().catch(() => {});
        if (actorId(ctx) === ADMIN_ID) return renderAdminPanel(ctx, false);
    });
    bot.action('start_broadcast', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        userState[actorId(ctx)] = 'WAITING_FOR_BROADCAST';
        await ctx.answerCbQuery();
        return ctx.editMessageText(adminSettingsMessages.enterBroadcast, {
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.cancel, callback_data: 'cancel_input' }]],
            },
        });
    });
    bot.action('admin_edit_pkgs', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback(adminSettingsMessages.text50Button, 'edit_pkg_t50'),
                Markup.button.callback(adminSettingsMessages.text200Button, 'edit_pkg_t200'),
                Markup.button.callback(adminSettingsMessages.text500Button, 'edit_pkg_t500'),
            ],
            [
                Markup.button.callback(adminSettingsMessages.image5Button, 'edit_pkg_i5'),
                Markup.button.callback(adminSettingsMessages.image15Button, 'edit_pkg_i15'),
                Markup.button.callback(adminSettingsMessages.image50Button, 'edit_pkg_i50'),
            ],
            [
                Markup.button.callback(commonMessages.litePackage, 'edit_pkg_lite'),
                Markup.button.callback(commonMessages.mediumPackage, 'edit_pkg_medium'),
            ],
            [
                Markup.button.callback(commonMessages.hardPackage, 'edit_pkg_hard'),
                Markup.button.callback(commonMessages.fullPackage, 'edit_pkg_full'),
            ],
            [Markup.button.callback(commonMessages.back, 'admin_back')],
        ]);
        return ctx.editMessageText(adminSettingsMessages.packageSettings, {
            parse_mode: 'Markdown',
            reply_markup: kb.reply_markup,
        });
    });
    ['lite', 'medium', 'hard', 'full', 't50', 't200', 't500', 'i5', 'i15', 'i50'].forEach((pkg) => {
        bot.action(`edit_pkg_${pkg}`, async (ctx) => {
            userState[actorId(ctx)] = `WAITING_EDIT_PKG_${pkg.toUpperCase()}`;
            await ctx.answerCbQuery();
            return ctx.editMessageText(adminSettingsMessages.editPackage(pkg.toUpperCase()), {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: commonMessages.cancel, callback_data: 'cancel_input' }],
                    ],
                },
            });
        });
    });
    bot.action('reset_free_limits', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        await resetAllFreeRequests(USER_REWARDS.initialTexts, USER_REWARDS.initialImages);
        return ctx.answerCbQuery(adminSettingsMessages.limitsReset, { show_alert: true });
    });
    return { renderAdminPanel };
}
