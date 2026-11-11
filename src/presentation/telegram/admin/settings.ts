import { Markup, type Context } from 'telegraf';

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
        const pSpent = Math.round((spent / total) * 100);
        const pOpened = Math.round((opened / total) * 100);
        const pPaid = Math.round((paid / total) * 100);
        const message =
            `👑 *Панель администратора*\n\n` +
            `📊 *Юзеры:*\n` +
            `├ За день: ${stats.users.day}\n` +
            `├ За неделю: ${stats.users.week}\n` +
            `└ Всего: ${stats.users.total}\n\n` +
            `💸 *Финансы:*\n` +
            `├ Выручка: ${stats.revenue.rub_total || 0} RUB | ${stats.revenue.stars_total || 0} XTR\n` +
            `└ Расход API: $${Number(stats.api_costs_time.total || 0).toFixed(4)}\n\n` +
            `🧲 *Воронка конверсии:*\n` +
            `1️⃣ Зашли в бота: ${total} чел.\n` +
            `2️⃣ Потратили лимит: ${spent} чел. (${pSpent}%)\n` +
            `3️⃣ Открыли магазин: ${opened} чел. (${pOpened}%)\n` +
            `4️⃣ Оплатили пакет: ${paid} чел. (${pPaid}%)\n\n` +
            `⚙️ *Режим работы:* ${freeMode ? '🟢 Free Mode (Безлимит)' : '🔴 Лимиты включены'}`;
        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('📢 Рассылка', 'start_broadcast'),
                Markup.button.callback('🎁 Промокоды', 'admin_promo_list'),
            ],
            [
                Markup.button.callback('👥 Все юзеры', 'users_page_1'),
                Markup.button.callback('🔍 Найти по ID', 'mu_start'),
            ],
            [
                Markup.button.callback('📦 Цены', 'admin_edit_pkgs'),
                Markup.button.callback('📝 Тексты', 'edit_texts_menu'),
            ],
            [Markup.button.callback('🔗 Ссылка на "Звезды"', 'edit_stars_url')],
            [Markup.button.callback('🔄 Сбросить лимиты всем (Подарок)', 'reset_free_limits')],
            [
                Markup.button.callback(
                    freeMode ? '🔴 Включить лимиты' : '🟢 Включить Free Mode',
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
        await ctx.answerCbQuery(`Бесплатный режим ${!currentStatus ? 'включен' : 'выключен'}`);
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
                Markup.button.callback('📜 Политика', 'edit_policy'),
                Markup.button.callback('📜 Соглашение', 'edit_agreement'),
            ],
            [Markup.button.callback('❓ FAQ', 'edit_faq')],
            [Markup.button.callback('🎧 Саппорт (URL)', 'edit_support')],
            [
                Markup.button.callback('📢 Канал бонуса (ID)', 'edit_bonus_channel_id'),
                Markup.button.callback('🔗 Ссылка бонуса', 'edit_bonus_channel_url'),
            ],
            [Markup.button.callback('⬅️ Назад', 'admin_back')],
        ]);
        const msg =
            `📝 <b>Настройка текстов и ссылок</b>\n\n` +
            `<i>Поддерживаются HTML-теги:</i>\n` +
            `<code>&lt;b&gt;жирный&lt;/b&gt;</code>\n` +
            `<code>&lt;i&gt;курсив&lt;/i&gt;</code>\n` +
            `<code>&lt;a href="ссылка"&gt;текст&lt;/a&gt;</code>\n\n` +
            `🔗 <b>Для канала бонуса:</b>\n` +
            `<b>ID:</b> <code>@username</code> или <code>-100...</code> (бот должен быть админом в канале!)\n` +
            `<b>Ссылка:</b> <code>https://t.me/...</code> для кнопки перехода.`;
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
            userState[actorId(ctx)] = `WAITING_EDIT_${action.slice(5).toUpperCase()}`;
            await ctx.answerCbQuery();
            return ctx.editMessageText('💬 Отправьте новое значение в чат:', {
                reply_markup: {
                    inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
                },
            });
        });
    });
    bot.action('cancel_input', async (ctx) => {
        delete userState[actorId(ctx)];
        await ctx.answerCbQuery('Действие отменено');
        await ctx.deleteMessage().catch(() => {});
        if (actorId(ctx) === ADMIN_ID) return renderAdminPanel(ctx, false);
    });
    bot.action('start_broadcast', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        userState[actorId(ctx)] = 'WAITING_FOR_BROADCAST';
        await ctx.answerCbQuery();
        return ctx.editMessageText(
            '📢 Отправьте мне текст сообщения для массовой рассылки (поддерживается разметка Markdown):',
            {
                reply_markup: {
                    inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
                },
            },
        );
    });
    bot.action('admin_edit_pkgs', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback('💬 50 шт.', 'edit_pkg_t50'),
                Markup.button.callback('💬 200 шт.', 'edit_pkg_t200'),
                Markup.button.callback('💬 500 шт.', 'edit_pkg_t500'),
            ],
            [
                Markup.button.callback('📸 5 шт.', 'edit_pkg_i5'),
                Markup.button.callback('📸 15 шт.', 'edit_pkg_i15'),
                Markup.button.callback('📸 50 шт.', 'edit_pkg_i50'),
            ],
            [
                Markup.button.callback('🎁 Lite', 'edit_pkg_lite'),
                Markup.button.callback('🎁 Medium', 'edit_pkg_medium'),
            ],
            [
                Markup.button.callback('🎁 Hard', 'edit_pkg_hard'),
                Markup.button.callback('🎁 Full', 'edit_pkg_full'),
            ],
            [Markup.button.callback('⬅️ Назад', 'admin_back')],
        ]);
        return ctx.editMessageText(
            '📦 *Настройка цен и пакетов*\n\nВыберите пакет для изменения его стоимости и лимитов:',
            { parse_mode: 'Markdown', reply_markup: kb.reply_markup },
        );
    });
    ['lite', 'medium', 'hard', 'full', 't50', 't200', 't500', 'i5', 'i15', 'i50'].forEach((pkg) => {
        bot.action(`edit_pkg_${pkg}`, async (ctx) => {
            userState[actorId(ctx)] = `WAITING_EDIT_PKG_${pkg.toUpperCase()}`;
            await ctx.answerCbQuery();
            return ctx.editMessageText(
                `✏️ Редактирование пакета *${pkg.toUpperCase()}*.\n\nВведите 4 числа через пробел:\n\`Звезды Рубли Тексты Фото\`\n\n_Например (35 звёзд, 50 руб, 50 текстов, 0 фото):_\n\`35 50 50 0\``,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel_input' }]],
                    },
                },
            );
        });
    });
    bot.action('reset_free_limits', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        await resetAllFreeRequests(10, 1);
        return ctx.answerCbQuery(
            'Лимиты всем пользователям успешно сброшены до 10 текстов и 1 фото!',
            { show_alert: true },
        );
    });
    return { renderAdminPanel };
}
