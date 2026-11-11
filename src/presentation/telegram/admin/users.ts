import { Markup, type Context } from 'telegraf';

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
        if (actorId(ctx) !== ADMIN_ID) return;
        const page = parseInt(required(ctx.match[1], 'Invalid callback data'), 10);
        const limit = 8;
        const offset = (page - 1) * limit;
        const totalUsers = await getUsersTotal();
        const totalPages = Math.ceil(totalUsers / limit) || 1;
        const users = await getUsersPage(limit, offset);
        const kb = [];
        users.forEach((u) => {
            const status = u.is_blocked ? '🚫' : '✅';
            const name = u.first_name ? u.first_name.substring(0, 15) : 'Без имени';
            kb.push([
                Markup.button.callback(
                    `${status} ID: ${u.telegram_id} | ${name}`,
                    `mu_open_${u.telegram_id}`,
                ),
            ]);
        });
        const nav = [];
        if (page > 1) nav.push(Markup.button.callback('⬅️', `users_page_${page - 1}`));
        nav.push(Markup.button.callback(`${page}/${totalPages}`, 'ignore'));
        if (page < totalPages) nav.push(Markup.button.callback('➡️', `users_page_${page + 1}`));
        kb.push(nav);
        kb.push([Markup.button.callback('🔍 Поиск по ID', 'mu_start')]);
        kb.push([Markup.button.callback('🔙 В админ-панель', 'admin_back')]);
        return ctx
            .editMessageText(
                `👥 <b>Список пользователей</b>\nНажмите на пользователя для управления:`,
                { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } },
            )
            .catch(() => {});
    });
    bot.action(/mu_open_(\d+)/, async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const targetId = parseInt(required(ctx.match[1], 'Invalid callback data'), 10);
        adminTargetUser[actorId(ctx)] = targetId;
        return renderUserManagePanel(ctx, targetId);
    });
    bot.action('ignore', async (ctx) => ctx.answerCbQuery());
    async function renderUserManagePanel(ctx: Context, targetId: UserId) {
        const tUser = await getUser(targetId);
        if (!tUser) return ctx.reply('Пользователь не найден.');
        const nameStr = tUser.first_name ? tUser.first_name : 'Неизвестно';
        const userStr = tUser.username ? `@${tUser.username}` : 'Нет';
        const msg =
            `👤 <b>Карточка юзера:</b> <code>${targetId}</code>\n` +
            `📝 <b>Имя:</b> ${nameStr} (${userStr})\n\n` +
            `💬 <b>Баланс сообщений:</b> ${tUser.text_balance || 0}\n` +
            `📸 <b>Баланс фото:</b> ${tUser.image_balance || 0}\n` +
            `💎 <b>Статус (Has Purchased):</b> ${tUser.has_purchased ? '✅ Да' : '❌ Нет'}\n` +
            `🚫 <b>Блокировка:</b> ${tUser.is_blocked ? 'Заблокирован' : 'Активен'}`;
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback('💬 Ред. Сообщения', 'mu_edit_text'),
                Markup.button.callback('📸 Ред. Фото', 'mu_edit_img'),
            ],
            [Markup.button.callback('📦 Выдать пакет', 'mu_set_package')],
            [
                Markup.button.callback('👑 Выдать VIP', 'mu_give_vip'),
                Markup.button.callback('💳 Платежи', 'mu_payments'),
            ],
            [
                Markup.button.callback(
                    tUser.is_blocked ? '✅ Разблокировать' : '🚫 Заблокировать',
                    'mu_block',
                ),
            ],
            [Markup.button.callback('✉️ Написать', 'mu_msg')],
            [Markup.button.callback('🔙 Назад', 'admin_back')],
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
        if (actorId(ctx) !== ADMIN_ID) return;
        userState[actorId(ctx)] = 'WAITING_MU_ID';
        await ctx.answerCbQuery();
        return ctx.editMessageText('🔍 Отправьте <b>Telegram ID</b> пользователя (только цифры):', {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
            },
        });
    });
    bot.action('mu_edit_text', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_MU_TEXT';
        await ctx.answerCbQuery();
        return ctx.reply('💬 Введите новое количество текстов (число):', {
            reply_markup: {
                inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
            },
        });
    });
    bot.action('mu_edit_img', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_MU_IMG';
        await ctx.answerCbQuery();
        return ctx.reply('📸 Введите новое количество фото (число):', {
            reply_markup: {
                inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
            },
        });
    });
    bot.action('mu_set_package', async (ctx) => {
        const kb = Markup.inlineKeyboard([
            [Markup.button.callback('📦 Lite (50/5)', 'mu_give_pkg_50_5')],
            [Markup.button.callback('💼 Medium (200/20)', 'mu_give_pkg_200_20')],
            [Markup.button.callback('🔥 Hard (500/50)', 'mu_give_pkg_500_50')],
            [Markup.button.callback('👑 Full (1000/100)', 'mu_give_pkg_1000_100')],
            [Markup.button.callback('🔙 Назад', 'mu_back_to_user')],
        ]);
        return ctx.editMessageText('📦 Выберите пакет для зачисления этому юзеру:', {
            reply_markup: kb.reply_markup,
        });
    });
    bot.action('mu_back_to_user', async (ctx) => {
        return renderUserManagePanel(ctx, required(adminTargetUser[actorId(ctx)]));
    });
    bot.action(/mu_give_pkg_(\d+)_(\d+)/, async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], 'Select a user first');
        const textCount = parseInt(required(ctx.match[1], 'Invalid callback data'), 10);
        const imgCount = parseInt(required(ctx.match[2], 'Invalid callback data'), 10);
        await grantPackage(targetId, textCount, imgCount, 0, 'ADMIN');
        await ctx.answerCbQuery('✅ Пакет успешно начислен!');
        return renderUserManagePanel(ctx, targetId);
    });
    bot.action('mu_give_vip', async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], 'Select a user first');
        await grantPackage(targetId, 99999, 9999, 0, 'ADMIN_VIP');
        await ctx.answerCbQuery('✅ VIP статус успешно выдан (99999 текстов, 9999 фото)!');
        return renderUserManagePanel(ctx, targetId);
    });
    bot.action('mu_payments', async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], 'Select a user first');
        const payments = await getPaymentHistory(targetId);
        if (payments.length === 0) {
            return ctx.answerCbQuery('У пользователя нет платежей.', { show_alert: true });
        }
        let msg = `💳 <b>История платежей (ID: ${targetId}):</b>\n\n`;
        for (const p of payments) {
            msg += `• ${new Date(p.created_at).toLocaleString('ru-RU')} - ${p.amount} ${p.currency}\n`;
        }
        return ctx.reply(msg, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[{ text: '❌ Закрыть', callback_data: 'cancel_input' }]],
            },
        });
    });
    bot.action('mu_msg', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_MU_MSG';
        await ctx.answerCbQuery();
        return ctx.reply('Введите текст сообщения, которое получит этот пользователь:', {
            reply_markup: {
                inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
            },
        });
    });
    bot.action('mu_block', async (ctx) => {
        const targetId = required(adminTargetUser[actorId(ctx)], 'Select a user first');
        const tUser = await getUser(targetId);
        if (!tUser) return ctx.answerCbQuery('Ошибка');
        await setBlockStatus(targetId, !tUser.is_blocked);
        await ctx.answerCbQuery(
            !tUser.is_blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован',
        );
        return renderUserManagePanel(ctx, targetId);
    });
    return { renderUserManagePanel };
}
