import { Markup, type Context } from 'telegraf';

import { DATABASE } from '@constants/database';
import { DECIMAL_RADIX } from '@constants/numbers';
import { CURRENCIES } from '@constants/payments';
import { UI_FORMAT } from '@constants/telegram';
import { ADMIN_GIFT_PACKAGES, ADMIN_VIP } from '@constants/users';
import { adminUserMessages } from '@messages/admin-users';
import { commonMessages } from '@messages/common';
import { errorMessages } from '@messages/errors';
import type { Runtime } from '@contracts/runtime';
import type { UserId } from '@contracts/user';
import { required } from '@domain/validation';
import { actorId } from '@telegram/context';

export function registerUsers(runtime: Runtime) {
    const { bot, repository, config, sessions } = runtime;
    const ADMIN_ID = config.adminId;
    const { userState, adminTargetUser } = sessions;
    const {
        getUser,
        setBlockStatus,
        getUsersTotal,
        getUsersPage,
        grantPackage,
        getPaymentHistory,
    } = repository;

    bot.action(/users_page_(\d+)/, async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) {
            return;
        }
        const page = parseInt(required(ctx.match[1], errorMessages.invalidCallback), DECIMAL_RADIX);
        const limit = DATABASE.usersPageSize;
        const offset = (page - 1) * limit;
        const totalUsers = await getUsersTotal();
        const totalPages = Math.ceil(totalUsers / limit) || 1;
        const users = await getUsersPage(limit, offset);
        const kb = [];

        users.forEach((u) => {
            const status = u.is_blocked ? commonMessages.blockedIcon : commonMessages.successIcon;
            const name = u.first_name
                ? u.first_name.substring(0, UI_FORMAT.userNameCharacters)
                : adminUserMessages.unnamed;
            kb.push([
                Markup.button.callback(
                    adminUserMessages.userButton(status, u.telegram_id, name),
                    `mu_open_${u.telegram_id}`,
                ),
            ]);
        });

        const nav = [];
        if (page > 1) {
            nav.push(Markup.button.callback(commonMessages.previous, `users_page_${page - 1}`));
        }
        nav.push(Markup.button.callback(adminUserMessages.pagination(page, totalPages), 'ignore'));
        if (page < totalPages) {
            nav.push(Markup.button.callback(commonMessages.next, `users_page_${page + 1}`));
        }
        kb.push(nav);
        kb.push([Markup.button.callback(adminUserMessages.searchById, 'mu_start')]);
        kb.push([Markup.button.callback(adminUserMessages.backToAdmin, 'admin_back')]);
        return ctx
            .editMessageText(adminUserMessages.listHeading, {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: kb },
            })
            .catch(() => {});
    });

    bot.action(/mu_open_(\d+)/, async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) {
            return;
        }
        const targetId = parseInt(
            required(ctx.match[1], errorMessages.invalidCallback),
            DECIMAL_RADIX,
        );
        adminTargetUser[actorId(ctx)] = targetId;
        return renderUserManagePanel(ctx, targetId);
    });

    bot.action('ignore', async (ctx) => ctx.answerCbQuery());

    async function renderUserManagePanel(ctx: Context, targetId: UserId) {
        const tUser = await getUser(targetId);
        if (!tUser) {
            return ctx.reply(adminUserMessages.notFound);
        }
        const nameStr = tUser.first_name ? tUser.first_name : commonMessages.unknown;
        const userStr = tUser.username
            ? adminUserMessages.username(tUser.username)
            : adminUserMessages.noUsername;
        const msg =
            adminUserMessages.cardHeading(targetId) +
            adminUserMessages.cardName(nameStr, userStr) +
            adminUserMessages.cardTextBalance(tUser.text_balance || 0) +
            adminUserMessages.cardImageBalance(tUser.image_balance || 0) +
            adminUserMessages.cardPurchaseStatus(
                tUser.has_purchased ? commonMessages.yes : commonMessages.no,
            ) +
            adminUserMessages.cardBlockStatus(
                tUser.is_blocked ? adminUserMessages.blockedStatus : commonMessages.active,
            );
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback(adminUserMessages.editTextBalance, 'mu_edit_text'),
                Markup.button.callback(adminUserMessages.editImageBalance, 'mu_edit_img'),
            ],
            [Markup.button.callback(adminUserMessages.grantPackage, 'mu_set_package')],
            [
                Markup.button.callback(adminUserMessages.grantVip, 'mu_give_vip'),
                Markup.button.callback(adminUserMessages.payments, 'mu_payments'),
            ],
            [
                Markup.button.callback(
                    tUser.is_blocked ? adminUserMessages.unblock : adminUserMessages.block,
                    'mu_block',
                ),
            ],
            [Markup.button.callback(adminUserMessages.messageUser, 'mu_msg')],
            [Markup.button.callback(commonMessages.returnBack, 'admin_back')],
        ]);
        if (ctx.callbackQuery) {
            return ctx
                .editMessageText(msg, { parse_mode: 'HTML', reply_markup: kb.reply_markup })
                .catch(() => {});
        } else {
            return ctx.reply(msg, { parse_mode: 'HTML', reply_markup: kb.reply_markup });
        }
    }

    bot.action('mu_start', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) {
            return;
        }
        userState[actorId(ctx)] = 'WAITING_MU_ID';
        await ctx.answerCbQuery();
        return ctx.editMessageText(adminUserMessages.enterId, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.cancel, callback_data: 'cancel_input' }]],
            },
        });
    });

    bot.action('mu_edit_text', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_MU_TEXT';
        await ctx.answerCbQuery();
        return ctx.reply(adminUserMessages.enterTextBalance, {
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.cancel, callback_data: 'cancel_input' }]],
            },
        });
    });

    bot.action('mu_edit_img', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_MU_IMG';
        await ctx.answerCbQuery();
        return ctx.reply(adminUserMessages.enterImageBalance, {
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.cancel, callback_data: 'cancel_input' }]],
            },
        });
    });

    bot.action('mu_set_package', async (ctx) => {
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback(
                    adminUserMessages.grantLite,
                    `mu_give_pkg_${ADMIN_GIFT_PACKAGES.lite.texts}_${ADMIN_GIFT_PACKAGES.lite.images}`,
                ),
            ],
            [
                Markup.button.callback(
                    adminUserMessages.grantMedium,
                    `mu_give_pkg_${ADMIN_GIFT_PACKAGES.medium.texts}_${ADMIN_GIFT_PACKAGES.medium.images}`,
                ),
            ],
            [
                Markup.button.callback(
                    adminUserMessages.grantHard,
                    `mu_give_pkg_${ADMIN_GIFT_PACKAGES.hard.texts}_${ADMIN_GIFT_PACKAGES.hard.images}`,
                ),
            ],
            [
                Markup.button.callback(
                    adminUserMessages.grantFull,
                    `mu_give_pkg_${ADMIN_GIFT_PACKAGES.full.texts}_${ADMIN_GIFT_PACKAGES.full.images}`,
                ),
            ],
            [Markup.button.callback(commonMessages.returnBack, 'mu_back_to_user')],
        ]);
        return ctx.editMessageText(adminUserMessages.selectPackage, {
            reply_markup: kb.reply_markup,
        });
    });

    bot.action('mu_back_to_user', async (ctx) => {
        return renderUserManagePanel(ctx, required(adminTargetUser[actorId(ctx)]));
    });

    bot.action(/mu_give_pkg_(\d+)_(\d+)/, async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], errorMessages.selectUserFirst);
        const textCount = parseInt(
            required(ctx.match[1], errorMessages.invalidCallback),
            DECIMAL_RADIX,
        );
        const imgCount = parseInt(
            required(ctx.match[2], errorMessages.invalidCallback),
            DECIMAL_RADIX,
        );
        await grantPackage(targetId, textCount, imgCount, 0, CURRENCIES.admin);
        await ctx.answerCbQuery(adminUserMessages.packageGranted);
        return renderUserManagePanel(ctx, targetId);
    });

    bot.action('mu_give_vip', async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], errorMessages.selectUserFirst);
        await grantPackage(targetId, ADMIN_VIP.texts, ADMIN_VIP.images, 0, CURRENCIES.adminVip);
        await ctx.answerCbQuery(adminUserMessages.vipGranted);
        return renderUserManagePanel(ctx, targetId);
    });

    bot.action('mu_payments', async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], errorMessages.selectUserFirst);
        const payments = await getPaymentHistory(targetId);
        if (payments.length === 0) {
            return ctx.answerCbQuery(adminUserMessages.noPayments, { show_alert: true });
        }
        let msg = adminUserMessages.paymentHistoryHeading(targetId);
        for (const p of payments) {
            msg += adminUserMessages.paymentHistoryEntry(
                new Date(p.created_at).toLocaleString(UI_FORMAT.locale),
                p.amount,
                p.currency,
            );
        }
        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.close, callback_data: 'cancel_input' }]],
            },
        });
    });

    bot.action('mu_msg', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_MU_MSG';
        await ctx.answerCbQuery();
        return ctx.reply(adminUserMessages.enterMessage, {
            reply_markup: {
                inline_keyboard: [[{ text: commonMessages.cancel, callback_data: 'cancel_input' }]],
            },
        });
    });

    bot.action('mu_block', async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], errorMessages.selectUserFirst);
        const tUser = await getUser(targetId);
        if (!tUser) {
            return ctx.answerCbQuery(commonMessages.error);
        }
        await setBlockStatus(targetId, !tUser.is_blocked);
        await ctx.answerCbQuery(
            !tUser.is_blocked ? adminUserMessages.blocked : adminUserMessages.unblocked,
        );
        return renderUserManagePanel(ctx, targetId);
    });

    return { renderUserManagePanel };
}
