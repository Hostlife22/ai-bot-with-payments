import type { Runtime } from '@contracts/runtime';
import type { AdminHandlers } from '@contracts/telegram';
import { nonNegativeInteger, required } from '@domain/validation';
import { parsePackage } from '@app/catalog';

import { chatId } from './context.js';

export function registerAdminInput(runtime: Runtime, admin: AdminHandlers) {
    const { bot, repository, config, sessions } = runtime;
    const ADMIN_ID = config.adminId;
    const { userState, adminPromoDraft, adminBroadcastMsg, adminTargetUser } = sessions;
    const { setSetting, adminSetTextBalance, adminSetImageBalance, updatePromoField } = repository;
    const { renderAdminPanel, renderPromoDraft, renderUserManagePanel } = admin;
    bot.on('text', async (ctx, next) => {
        const userId = ctx.from.id;
        const state = userState[userId];
        if (
            userId !== ADMIN_ID ||
            !state ||
            state === 'WAITING_FOR_CUSTOM_PROMPT' ||
            state === 'WAITING_FOR_PROMOCODE'
        )
            return next();
        const text = ctx.message.text;
        if (userId === ADMIN_ID) {
            if (userState[userId] === 'WAITING_MU_ID') {
                const targetId = nonNegativeInteger(text.trim(), 'Значение');
                if (isNaN(targetId))
                    return ctx.reply('❌ Ошибка: нужно отправить только ID (цифры).');
                adminTargetUser[userId] = targetId;
                delete userState[userId];
                await ctx.deleteMessage().catch(() => {});
                return renderUserManagePanel(ctx, targetId);
            }
            const targetId = adminTargetUser[userId];
            if (targetId) {
                if (userState[userId] === 'WAITING_MU_TEXT') {
                    const count = nonNegativeInteger(text.trim(), 'Значение');
                    if (isNaN(count) || count < 0)
                        return ctx.reply('❌ Введите положительное число.');
                    await adminSetTextBalance(targetId, count);
                    delete userState[userId];
                    await ctx.reply('✅ Количество запросов изменено!');
                    return renderUserManagePanel(ctx, targetId);
                }
                if (userState[userId] === 'WAITING_MU_IMG') {
                    const count = nonNegativeInteger(text.trim(), 'Значение');
                    if (isNaN(count) || count < 0)
                        return ctx.reply('❌ Введите положительное число.');
                    await adminSetImageBalance(targetId, count);
                    delete userState[userId];
                    await ctx.reply('✅ Количество фото изменено!');
                    return renderUserManagePanel(ctx, targetId);
                }
                if (userState[userId] === 'WAITING_MU_MSG') {
                    delete userState[userId];
                    try {
                        await bot.telegram.sendMessage(
                            targetId,
                            `💬 <b>Сообщение от администрации:</b>\n\n${text}`,
                            { parse_mode: 'HTML' },
                        );
                        await ctx.reply('✅ Сообщение успешно доставлено пользователю!');
                    } catch (e) {
                        await ctx.reply(
                            '❌ Ошибка доставки (возможно, пользователь заблокировал бота).',
                        );
                    }
                    return renderUserManagePanel(ctx, targetId);
                }
            }
        }
        if (
            userId === ADMIN_ID &&
            userState[userId] &&
            userState[userId].startsWith('WAITING_EDIT_PKG_')
        ) {
            const pkgType = userState[userId].replace('WAITING_EDIT_PKG_', '').toLowerCase();
            const parts = text.trim().split(/\s+/);
            if (parts.length !== 4 || parts.some((p) => Number.isNaN(Number(p)))) {
                return ctx.reply(
                    '❌ Ошибка! Введите ровно 4 числа через пробел (Звезды Рубли Сообщения Фото).\nПример: 25 35 50 5',
                );
            }
            parsePackage(parts.join('_'));
            await setSetting(`pkg_${pkgType}`, `${parts[0]}_${parts[1]}_${parts[2]}_${parts[3]}`);
            delete userState[userId];
            await ctx.reply(`✅ Настройки пакета ${pkgType.toUpperCase()} успешно обновлены!`);
            return renderAdminPanel(ctx, false);
        }
        const adminStates: Record<string, string> = {
            WAITING_EDIT_STARS_URL: 'buy_stars_url',
            WAITING_EDIT_POLICY: 'policy_text',
            WAITING_EDIT_AGREEMENT: 'agreement_text',
            WAITING_EDIT_FAQ: 'faq_text',
            WAITING_EDIT_SUPPORT: 'support_url',
            WAITING_EDIT_BONUS_CHANNEL_ID: 'bonus_channel_id',
            WAITING_EDIT_BONUS_CHANNEL_URL: 'bonus_channel_url',
        };
        if (userId === ADMIN_ID && adminStates[userState[userId] ?? '']) {
            const settingKey = required(adminStates[userState[userId] ?? '']);
            if (
                ![
                    'vip_channel_id',
                    'vip_channel_url',
                    'buy_stars_url',
                    'policy_text',
                    'agreement_text',
                    'faq_text',
                    'support_url',
                    'bonus_channel_id',
                    'bonus_channel_url',
                ].includes(settingKey)
            ) {
                const num = nonNegativeInteger(text.trim(), 'Значение');
                if (isNaN(num) || num < 1) return ctx.reply('❌ Ошибка: введите число.');
                await setSetting(settingKey, num);
            } else {
                await setSetting(settingKey, text.trim());
            }
            delete userState[userId];
            await ctx.reply(`✅ Сохранено!`, { parse_mode: 'Markdown' });
            return renderAdminPanel(ctx, false);
        }
        if (userId === ADMIN_ID && userState[userId] === 'WAITING_NEW_PROMO_CODE') {
            const code = text.trim().replace(/\s+/g, '_').toUpperCase();
            adminPromoDraft[userId] = {
                code: code,
                uses: 100,
                textReward: 10,
                imgReward: 1,
                discount: 0,
                newOnly: false,
            };
            delete userState[userId];
            await ctx.deleteMessage().catch(() => {});
            return renderPromoDraft(ctx);
        }
        if (
            userId === ADMIN_ID &&
            userState[userId] &&
            userState[userId].startsWith('WAITING_PDRAFT_')
        ) {
            const field = userState[userId].replace('WAITING_PDRAFT_', '').toLowerCase();
            const num = nonNegativeInteger(text.trim(), 'Значение');
            if (isNaN(num) || num < 0) return ctx.reply('❌ Введите положительное число.');
            const draft = adminPromoDraft[userId];
            if (!draft) return ctx.reply('Черновик не найден.');
            if (field === 'uses') draft.uses = num;
            else if (field === 'text') draft.textReward = num;
            else if (field === 'img') draft.imgReward = num;
            else if (field === 'disc') draft.discount = num;
            delete userState[userId];
            await ctx.deleteMessage().catch(() => {});
            const lastMsgId = ctx.message.message_id - 1;
            await bot.telegram.deleteMessage(chatId(ctx), lastMsgId).catch(() => {});
            return renderPromoDraft(ctx);
        }
        if (
            userId === ADMIN_ID &&
            userState[userId] &&
            userState[userId].startsWith('WAITING_PEDIT_')
        ) {
            const parts = userState[userId].split('_');
            const field = required(parts[2]).toLowerCase();
            const id = Number(parts[3]);
            const num = nonNegativeInteger(text.trim(), 'Значение');
            if (isNaN(num) || num < 0) return ctx.reply('❌ Введите положительное число.');
            await updatePromoField(id, field, num);
            delete userState[userId];
            return ctx.reply('✅ Параметр успешно обновлен в базе!', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Вернуться к промокоду', callback_data: `p_manage_${id}` }],
                    ],
                },
            });
        }
        if (userId === ADMIN_ID && userState[userId] === 'WAITING_FOR_BROADCAST') {
            userState[userId] = 'WAITING_FOR_BROADCAST_BTN';
            adminBroadcastMsg[userId] = { type: 'text', text: text, btn: 'none' };
            return ctx.reply(`Хотите добавить кнопку к рассылке? Выберите из меню ниже:`, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '👤 Профиль', callback_data: 'broadcast_btn_profile' },
                            { text: '🧠 Настройка ИИ', callback_data: 'broadcast_btn_ai' },
                        ],
                        [
                            { text: '👥 Рефералы', callback_data: 'broadcast_btn_refs' },
                            { text: '🆘 Помощь', callback_data: 'broadcast_btn_help' },
                        ],
                        [{ text: '⭐️ Магазин', callback_data: 'broadcast_btn_store' }],
                        [{ text: 'Без кнопки', callback_data: 'broadcast_btn_none' }],
                        [{ text: '❌ Отмена', callback_data: 'cancel_input' }],
                    ],
                },
            });
        }
        return next();
    });
}
