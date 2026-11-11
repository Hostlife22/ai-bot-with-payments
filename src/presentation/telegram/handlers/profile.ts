import { Markup, type Context, type Telegraf } from 'telegraf';

import { PERCENT } from '@constants/numbers';
import { TELEGRAM_LIMITS, UI_FORMAT } from '@constants/telegram';
import { commonMessages } from '@messages/common';
import { logMessages } from '@messages/logs';
import { profileMessages } from '@messages/profile';
import type { Repository } from '@contracts/repositories';
import type { UserStates } from '@contracts/sessions';
import type { Themes } from '@contracts/themes';
import { actorId } from '@telegram/context';

export function setupProfile(
    bot: Telegraf,
    userState: UserStates,
    themeConfig: Themes,
    repository: Repository,
) {
    const {
        getUser,
        createUser,
        isFreeModeEnabled,
        getReferralsCount,
        claimDailyBonus,
        getSetting,
    } = repository;
    bot.hears(commonMessages.profile, (ctx) => showProfile(ctx, userState, themeConfig));

    bot.action('menu_profile', async (ctx) => {
        await ctx.answerCbQuery();
        return showProfile(ctx, userState, themeConfig);
    });

    bot.hears(commonMessages.referrals, showRefs);

    bot.action('menu_refs', async (ctx) => {
        await ctx.answerCbQuery();
        return showRefs(ctx);
    });

    bot.hears(commonMessages.dailyBonus, showDailyBonus);

    bot.action('claim_daily_bonus', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        return showDailyBonus(ctx);
    });

    bot.action('check_bonus_sub', async (ctx) => {
        const channelId = await getSetting('bonus_channel_id', '');
        if (channelId && channelId.length >= TELEGRAM_LIMITS.minimumChannelIdLength) {
            const cleanChannelId = channelId.replace(/['"\s\u200B-\u200D\uFEFF]/g, '');
            try {
                const member = await ctx.telegram.getChatMember(cleanChannelId, actorId(ctx));
                if (!['member', 'administrator', 'creator'].includes(member.status)) {
                    return ctx.answerCbQuery(profileMessages.subscriptionRequired, {
                        show_alert: true,
                    });
                }
            } catch (e) {
                console.error(logMessages.subscriptionCheckFailed, e);
                return ctx.answerCbQuery(profileMessages.subscriptionCheckError, {
                    show_alert: true,
                });
            }
        }
        const success = await claimDailyBonus(actorId(ctx));
        if (success) {
            await ctx.answerCbQuery(profileMessages.bonusGranted, { show_alert: true });
            return showProfile(ctx, userState, themeConfig);
        } else {
            await ctx.answerCbQuery(profileMessages.bonusAlreadyClaimed, {
                show_alert: true,
            });
        }
    });

    bot.action('enter_promocode', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_FOR_PROMOCODE';
        await ctx.answerCbQuery();
        return ctx.reply(profileMessages.enterPromocode, {
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.cancel, callback_data: 'cancel_input' }]],
            },
        });
    });

    async function showDailyBonus(ctx: Context) {
        const channelId = await getSetting('bonus_channel_id', '');
        const channelUrl = await getSetting('bonus_channel_url', '');
        const msg =
            profileMessages.bonusHeading +
            (channelId && channelUrl
                ? profileMessages.bonusSubscriptionInstructions
                : profileMessages.bonusClaimInstructions);
        const kb = [];
        if (channelId && channelUrl) {
            kb.push([Markup.button.url(profileMessages.subscribe, channelUrl)]);
        }
        kb.push([Markup.button.callback(profileMessages.checkSubscription, 'check_bonus_sub')]);
        kb.push([Markup.button.callback(profileMessages.backToProfile, 'menu_profile')]);
        if (ctx.callbackQuery) {
            return ctx
                .editMessageText(msg, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: kb },
                })
                .catch(() => {});
        } else {
            return ctx.reply(msg, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb },
            });
        }
    }

    async function showProfile(ctx: Context, userState: UserStates, themeConfig: Themes) {
        if (userState) {
            delete userState[actorId(ctx)];
        }
        const userId = actorId(ctx);
        let user = await getUser(userId);
        if (!user) {
            await createUser(userId);
            user = await repository.requireUser(userId);
        }
        const freeMode = await isFreeModeEnabled();
        const mode = user.roleplay_mode || 'flirt';
        const theme = themeConfig[mode] || themeConfig['default'];
        const maxLevel = UI_FORMAT.fullProgressBalance;
        let percent = 0;
        let fillCount = 0;
        let statusText = theme.max;
        if (freeMode) {
            percent = PERCENT;
            fillCount = UI_FORMAT.progressSegments;
        } else {
            percent = Math.min(PERCENT, Math.round((user.text_balance / maxLevel) * PERCENT));
            fillCount = Math.floor((percent / PERCENT) * UI_FORMAT.progressSegments);
            if (user.text_balance > 0 && fillCount === 0) {
                fillCount = 1;
            }
            if (!user.has_purchased && user.text_balance === 0) {
                statusText = profileMessages.emptyBalanceStatus;
            } else if (user.text_balance > UI_FORMAT.profileStatusThresholds.high) {
                statusText = theme.statuses[3];
            } else if (user.text_balance > UI_FORMAT.profileStatusThresholds.medium) {
                statusText = theme.statuses[2];
            } else if (user.text_balance > UI_FORMAT.profileStatusThresholds.low) {
                statusText = theme.statuses[1];
            } else {
                statusText = theme.statuses[0];
            }
        }
        const progressBar =
            theme.fill.repeat(fillCount) +
            theme.empty.repeat(UI_FORMAT.progressSegments - fillCount);
        const levelText = freeMode
            ? profileMessages.maxLevel
            : profileMessages.levelPercent(percent);
        const msg =
            profileMessages.heading +
            profileMessages.userId(userId) +
            profileMessages.level(theme.title, levelText) +
            profileMessages.progress(progressBar) +
            profileMessages.status(statusText) +
            profileMessages.textBalance(user.text_balance) +
            profileMessages.imageBalance(user.image_balance);
        const kb = Markup.inlineKeyboard([
            [Markup.button.callback(profileMessages.topUp, 'trigger_buy')],
            [Markup.button.callback(commonMessages.dailyBonus, 'claim_daily_bonus')],
            [Markup.button.callback(profileMessages.enterPromocodeButton, 'enter_promocode')],
        ]);
        if (ctx.callbackQuery) {
            return ctx
                .editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb.reply_markup })
                .catch(() => {});
        }
        return ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb.reply_markup });
    }

    async function showRefs(ctx: Context) {
        const userId = actorId(ctx);
        const refCount = await getReferralsCount(userId);
        const botUsername = ctx.botInfo.username;
        const msg =
            profileMessages.referralsHeading +
            profileMessages.referralInstructions +
            profileMessages.referrerReward +
            profileMessages.inviteeReward +
            profileMessages.referralCount(refCount) +
            profileMessages.referralLinkHeading +
            profileMessages.referralLink(botUsername, userId);
        return ctx.reply(msg, { parse_mode: 'Markdown' });
    }
}
