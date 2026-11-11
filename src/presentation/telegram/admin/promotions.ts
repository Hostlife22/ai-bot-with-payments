import { Markup, type Context } from 'telegraf';

import type { Runtime } from '@contracts/runtime';
import { required } from '@domain/validation';
import { actorId } from '@telegram/context';

export function registerPromotions(runtime: Runtime) {
    const { bot, repository, config, sessions } = runtime;
    const ADMIN_ID = config.adminId;
    const { userState, adminPromoDraft } = sessions;
    const {
        createPromocode,
        getAllPromocodes,
        getPromocodeById,
        togglePromoStatus,
        togglePromoNewUsersOnly,
        deletePromocode,
    } = repository;
    bot.action('admin_promo_list', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const promos = await getAllPromocodes();
        let msg = `🎫 *Список промокодов*\n\n`;
        const kb = [];
        if (promos.length === 0) {
            msg += `_Промокодов пока нет._`;
        } else {
            promos.forEach((p) => {
                const statusIcon = p.is_active ? '✅' : '❌';
                const usesDone = p.max_uses_total - p.uses_left;
                msg += `${statusIcon} 🎁 *${p.code}*\n`;
                msg += `📊 Использований: ${usesDone}/${p.max_uses_total}\n`;
                if (p.discount_amount > 0) msg += `💰 Скидка: ${p.discount_amount} %\n`;
                if (p.text_reward > 0) msg += `✉️ Сообщений: +${p.text_reward}\n`;
                msg += `\n`;
                kb.push([Markup.button.callback(`🎫 ${p.code}`, `p_manage_${p.id}`)]);
            });
        }
        kb.push([Markup.button.callback('➕ Создать', 'p_create')]);
        kb.push([Markup.button.callback('⬅️ Назад', 'admin_back')]);
        return ctx
            .editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } })
            .catch(() => {});
    });
    bot.action(/p_manage_(\d+)/, async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const promoId = parseInt(required(ctx.match[1], 'Invalid callback data'), 10);
        const p = await getPromocodeById(promoId);
        if (!p) return ctx.answerCbQuery('Промокод не найден');
        const usesDone = p.max_uses_total - p.uses_left;
        const statusText = p.is_active ? 'Активен' : 'Отключен';
        const statusIcon = p.is_active ? '✅' : '❌';
        const newOnlyIcon = p.is_new_users_only ? '✅' : '❌';
        const dateStr = new Date(p.created_at).toLocaleDateString('ru-RU');
        const msg =
            `🎫 *Управление промокодом*\n\n` +
            `🎁 Код: *${p.code}*\n` +
            `${statusIcon} Статус: ${statusText}\n` +
            `📊 Использований: ${usesDone}/${p.max_uses_total}\n` +
            `🆕 Только первая покупка: ${newOnlyIcon}\n` +
            `📅 Создан: ${dateStr}\n\n` +
            `*Бонусы:*\n` +
            `✉️ Текст: ${p.text_reward} | 📸 Фото: ${p.img_reward} | 💰 Скидка: ${p.discount_amount}%`;
        const kb = [
            [Markup.button.callback('✏️ Изменить бонусы и лимит', `p_edit_bonuses_${p.id}`)],
            [Markup.button.callback('🔄 Переключить статус', `p_tgl_stat_${p.id}`)],
            [Markup.button.callback(`🆕 Первая покупка: ${newOnlyIcon}`, `p_tgl_new_${p.id}`)],
            [Markup.button.callback('🗑 Удалить', `p_del_${p.id}`)],
            [Markup.button.callback('⬅️ К списку', 'admin_promo_list')],
        ];
        return ctx
            .editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } })
            .catch(() => {});
    });
    bot.action(/p_tgl_stat_(\d+)/, async (ctx) => {
        await togglePromoStatus(parseInt(required(ctx.match[1], 'Invalid callback data'), 10));
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: {
                ...ctx.callbackQuery,
                data: `p_manage_${required(ctx.match[1], 'Invalid callback data')}`,
            },
        });
    });
    bot.action(/p_tgl_new_(\d+)/, async (ctx) => {
        await togglePromoNewUsersOnly(
            parseInt(required(ctx.match[1], 'Invalid callback data'), 10),
        );
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: {
                ...ctx.callbackQuery,
                data: `p_manage_${required(ctx.match[1], 'Invalid callback data')}`,
            },
        });
    });
    bot.action(/p_del_(\d+)/, async (ctx) => {
        await deletePromocode(parseInt(required(ctx.match[1], 'Invalid callback data'), 10));
        await ctx.answerCbQuery('🗑 Промокод удален!', { show_alert: true });
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: { ...ctx.callbackQuery, data: 'admin_promo_list' },
        });
    });
    bot.action(/p_edit_bonuses_(\d+)/, async (ctx) => {
        const id = required(ctx.match[1], 'Invalid callback data');
        const kb = [
            [
                Markup.button.callback('✉️ Текст', `p_ed_text_${id}`),
                Markup.button.callback('📸 Фото', `p_ed_img_${id}`),
            ],
            [
                Markup.button.callback('💰 Скидка', `p_ed_disc_${id}`),
                Markup.button.callback('📊 Лимит юзов', `p_ed_uses_${id}`),
            ],
            [Markup.button.callback('⬅️ Назад', `p_manage_${id}`)],
        ];
        return ctx.editMessageText('Что именно вы хотите изменить у этого промокода?', {
            reply_markup: { inline_keyboard: kb },
        });
    });
    bot.action(/p_ed_(text|img|disc|uses)_(\d+)/, async (ctx) => {
        const field = required(ctx.match[1], 'Invalid callback data');
        const id = required(ctx.match[2], 'Invalid callback data');
        userState[actorId(ctx)] = `WAITING_PEDIT_${field.toUpperCase()}_${id}`;
        await ctx.answerCbQuery();
        return ctx.reply(`Введите новое числовое значение:`, {
            reply_markup: {
                inline_keyboard: [[{ text: 'Отмена', callback_data: `p_manage_${id}` }]],
            },
        });
    });
    bot.action('p_create', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_NEW_PROMO_CODE';
        await ctx.answerCbQuery();
        return ctx.editMessageText('📝 Введите текст для нового промокода (например: `SALE20`):', {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: 'Отмена', callback_data: 'admin_promo_list' }]],
            },
        });
    });
    async function renderPromoDraft(ctx: Context) {
        const draft = adminPromoDraft[actorId(ctx)];
        if (!draft)
            return ctx.reply('Ошибка черновика.', {
                reply_markup: {
                    inline_keyboard: [[{ text: 'В меню', callback_data: 'admin_promo_list' }]],
                },
            });
        const msg =
            `🛠 *Создание промокода*\n\n` +
            `Код: *${draft.code}*\n` +
            `Лимит использований: ${draft.uses}\n` +
            `Только первая покупка: ${draft.newOnly ? '✅' : '❌'}\n\n` +
            `*Бонусы:*\n` +
            `Текст: +${draft.textReward} | Фото: +${draft.imgReward} | Скидка: ${draft.discount} %\n\n` +
            `_Настройте параметры и нажмите "Сохранить"_`;
        const kb = [
            [
                Markup.button.callback(`✉️ Текст (${draft.textReward})`, 'pdraft_text'),
                Markup.button.callback(`📸 Фото (${draft.imgReward})`, 'pdraft_img'),
            ],
            [
                Markup.button.callback(`💰 Скидка (${draft.discount}%)`, 'pdraft_disc'),
                Markup.button.callback(`📊 Лимит (${draft.uses})`, 'pdraft_uses'),
            ],
            [
                Markup.button.callback(
                    `🆕 Первая покупка: ${draft.newOnly ? '✅' : '❌'}`,
                    'pdraft_newonly',
                ),
            ],
            [Markup.button.callback('💾 Сохранить в базу', 'pdraft_save')],
            [Markup.button.callback('Отмена', 'admin_promo_list')],
        ];
        if (ctx.callbackQuery) {
            return ctx
                .editMessageText(msg, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: kb },
                })
                .catch(() => {});
        }
        return ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } });
    }
    bot.action(/pdraft_(text|img|disc|uses)/, async (ctx) => {
        const field = required(ctx.match[1], 'Invalid callback data');
        userState[actorId(ctx)] = `WAITING_PDRAFT_${field.toUpperCase()}`;
        await ctx.answerCbQuery();
        return ctx.reply(`Введите новое числовое значение:`, {
            reply_markup: {
                inline_keyboard: [[{ text: 'Отмена', callback_data: 'pdraft_cancel_input' }]],
            },
        });
    });
    bot.action('pdraft_newonly', async (ctx) => {
        const draft = adminPromoDraft[actorId(ctx)];
        if (draft) draft.newOnly = !draft.newOnly;
        return renderPromoDraft(ctx);
    });
    bot.action('pdraft_cancel_input', async (ctx) => {
        delete userState[actorId(ctx)];
        await ctx.deleteMessage().catch(() => {});
        return renderPromoDraft(ctx);
    });
    bot.action('pdraft_save', async (ctx) => {
        const draft = adminPromoDraft[actorId(ctx)];
        if (!draft) return ctx.answerCbQuery('Ошибка');
        await createPromocode(
            draft.code,
            draft.uses,
            draft.textReward,
            draft.imgReward,
            draft.discount,
            1,
            draft.newOnly,
        );
        delete adminPromoDraft[actorId(ctx)];
        await ctx.answerCbQuery('✅ Промокод сохранен!', { show_alert: true });
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: { ...ctx.callbackQuery, data: 'admin_promo_list' },
        });
    });
    return { renderPromoDraft };
}
