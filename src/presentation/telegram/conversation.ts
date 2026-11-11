import type { BroadcastMessage } from '@contracts/jobs';
import type { Runtime } from '@contracts/runtime';
import type { AdminHandlers, Core } from '@contracts/telegram';
import { required } from '@domain/validation';
import { setupAi } from '@handlers/ai_menu';
import { setupHelp } from '@handlers/help';
import { setupProfile } from '@handlers/profile';

import { registerAdminInput } from './admin-input.js';
import { actorId, chatId } from './context.js';
import { processReferral } from './referral.js';
import { modeNames, themeConfig } from './themes.js';

export function registerConversation(runtime: Runtime, core: Core, admin: AdminHandlers) {
    const { bot, repository, config, sessions, queues } = runtime;
    const ADMIN_ID = config.adminId;
    const { userState, adminBroadcastMsg, lastMessageTime } = sessions;
    const { aiQueue } = queues;
    const {
        isFreeModeEnabled,
        setUserPrompt,
        clearHistory,
        updateUserMeta,
        updateLastActive,
        activatePromocode,
    } = repository;
    const { getMainKeyboard, requireTerms } = core;
    const { renderAdminPanel } = admin;
    bot.start(async (ctx) => {
        await processReferral(ctx, repository);
        const user = await repository.requireUser(ctx.from.id);
        if (user.is_blocked && ctx.from.id !== ADMIN_ID)
            return ctx.reply('❌ Ваш аккаунт заблокирован.');
        await repository.updateUserMeta(ctx.from.id, ctx.from.first_name, ctx.from.username);
        if (!(await requireTerms(ctx, actorId(ctx)))) return;
        return ctx.reply(
            'Привет! Я нейросеть. Воспользуйся меню ниже для настройки и управления профилем 👇',
            getMainKeyboard(actorId(ctx)),
        );
    });
    bot.hears('👑 Админ-панель', (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        delete userState[actorId(ctx)];
        return renderAdminPanel(ctx, false);
    });
    setupHelp(bot, repository);
    setupProfile(bot, userState, themeConfig, repository);
    setupAi(bot, userState, modeNames, repository);
    registerAdminInput(runtime, admin);
    bot.on(['photo', 'video', 'document', 'animation'], async (ctx) => {
        const userId = actorId(ctx);
        if (userId === ADMIN_ID && userState[userId] === 'WAITING_FOR_BROADCAST') {
            userState[userId] = 'WAITING_FOR_BROADCAST_BTN';
            let msgType: Exclude<BroadcastMessage['type'], 'text'> = 'photo';
            let fileId = '';
            if ('photo' in ctx.message) {
                msgType = 'photo';
                fileId = required(ctx.message.photo.at(-1)).file_id;
            } else if ('video' in ctx.message) {
                msgType = 'video';
                fileId = ctx.message.video.file_id;
            } else if ('animation' in ctx.message) {
                msgType = 'animation';
                fileId = ctx.message.animation.file_id;
            } else if ('document' in ctx.message) {
                msgType = 'document';
                fileId = ctx.message.document.file_id;
            }
            adminBroadcastMsg[userId] = {
                type: msgType,
                file_id: fileId,
                caption: ctx.message.caption || '',
                btn: 'none',
            };
            return ctx.reply(
                `Медиа получено. Хотите добавить кнопку к рассылке? Выберите из меню ниже:`,
                {
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
                },
            );
        }
    });
    bot.on('text', async (ctx) => {
        const userId = actorId(ctx);
        const text = ctx.message.text;
        await updateUserMeta(userId, ctx.from.first_name, ctx.from.username);
        await updateLastActive(userId).catch(() => {});
        const user = await repository.requireUser(userId);
        if (userState[userId] === 'WAITING_FOR_PROMOCODE') {
            const promo = await activatePromocode(userId, text.trim().toUpperCase());
            delete userState[userId];
            if (promo === 'NOT_FOUND') return ctx.reply('❌ Промокод не найден.');
            if (promo === 'INACTIVE') return ctx.reply('❌ Этот промокод больше не активен.');
            if (promo === 'LIMIT_EXCEEDED')
                return ctx.reply('❌ Количество активаций этого промокода исчерпано.');
            if (promo === 'ALREADY_USED') return ctx.reply('❌ Вы уже использовали этот промокод.');
            if (promo === 'ONLY_NEW')
                return ctx.reply(
                    '❌ Этот промокод действует только для новых пользователей на первую покупку.',
                );
            if (promo) {
                let msg = '✅ *Промокод успешно активирован!*\n';
                if (promo.text_reward > 0) msg += `\n✉️ Сообщений: +${promo.text_reward}`;
                if (promo.img_reward > 0) msg += `\n📸 Фото: +${promo.img_reward}`;
                if (promo.discount_amount > 0)
                    msg += `\n💰 Скидка на покупку: ${promo.discount_amount} %`;
                return ctx.reply(msg, { parse_mode: 'Markdown' });
            }
        }
        if (userState[userId] === 'WAITING_FOR_CUSTOM_PROMPT') {
            const MAX_PROMPT_LENGTH = 1000;
            if (text.length > MAX_PROMPT_LENGTH) {
                return ctx.reply(
                    `❌ *Слишком длинный текст!*\nМаксимум ${MAX_PROMPT_LENGTH} символов (у вас ${text.length}).\n\n_Попробуйте еще раз._`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '❌ Отмена', callback_data: 'cancel_input' }],
                            ],
                        },
                    },
                );
            }
            await setUserPrompt(userId, text, 'custom');
            await clearHistory(userId);
            delete userState[userId];
            return ctx.reply(
                `✅ Готово!\n_Свой системный промпт успешно установлен. Контекст диалога очищен._\n\n*Новый режим:*\n🔸 _Свой системный промпт_`,
                { parse_mode: 'Markdown' },
            );
        }
        const MAX_QUERY_LENGTH = 1000;
        if (userId !== ADMIN_ID && text.length > MAX_QUERY_LENGTH) {
            return ctx.reply(
                `⚠️ *Ваш запрос слишком длинный!*\nПожалуйста, сократите текст до ${MAX_QUERY_LENGTH} символов (сейчас в нем ${text.length}).\n\n_Большие тексты лучше разбивать на несколько сообщений._`,
                { parse_mode: 'Markdown' },
            );
        }
        const now = Date.now();
        const cooldownMs = 5000;
        if (userId !== ADMIN_ID) {
            const userLastMsgTime = lastMessageTime[userId] || 0;
            const timePassed = now - userLastMsgTime;
            if (timePassed < cooldownMs) {
                const secLeft = Math.ceil((cooldownMs - timePassed) / 1000);
                return ctx.reply(
                    `⏳ *Анти-спам:*\nПожалуйста, подождите ${secLeft} сек. перед следующим запросом.`,
                    { parse_mode: 'Markdown' },
                );
            }
            lastMessageTime[userId] = now;
        }
        const freeModeActive = await isFreeModeEnabled();
        if (!freeModeActive) {
            if (user.text_balance <= 0) {
                return ctx.reply(
                    'У вас закончились сообщения 😔\nВыберите удобный пакет в магазине 💎',
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '⭐️ Магазин', callback_data: 'trigger_buy' }],
                            ],
                        },
                    },
                );
            }
        }
        const shouldDecrement = !freeModeActive;
        const tempMsg = await ctx.reply('⏳ _Печатаю ответ..._', { parse_mode: 'Markdown' });
        await aiQueue.add(
            'ask-ai',
            { userId, text, chatId: chatId(ctx), shouldDecrement, tempMsgId: tempMsg.message_id },
            { jobId: `telegram-${ctx.update.update_id}` },
        );
    });
}
