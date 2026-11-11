import { CATALOG } from '@constants/catalog';
import { PROMOTIONS } from '@constants/promotions';
import { adminInputMessages } from '@messages/admin-input';
import { commonMessages } from '@messages/common';
import { fieldNames } from '@messages/fields';
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
        ) {
            return next();
        }
        const text = ctx.message.text;
        if (userId === ADMIN_ID) {
            if (userState[userId] === 'WAITING_MU_ID') {
                const targetId = nonNegativeInteger(text.trim(), fieldNames.value);
                if (isNaN(targetId)) {
                    return ctx.reply(adminInputMessages.invalidUserId);
                }
                adminTargetUser[userId] = targetId;
                delete userState[userId];
                await ctx.deleteMessage().catch(() => {});
                return renderUserManagePanel(ctx, targetId);
            }
            const targetId = adminTargetUser[userId];
            if (targetId) {
                if (userState[userId] === 'WAITING_MU_TEXT') {
                    const count = nonNegativeInteger(text.trim(), fieldNames.value);
                    if (isNaN(count) || count < 0) {
                        return ctx.reply(adminInputMessages.positiveNumberRequired);
                    }
                    await adminSetTextBalance(targetId, count);
                    delete userState[userId];
                    await ctx.reply(adminInputMessages.textBalanceUpdated);
                    return renderUserManagePanel(ctx, targetId);
                }
                if (userState[userId] === 'WAITING_MU_IMG') {
                    const count = nonNegativeInteger(text.trim(), fieldNames.value);
                    if (isNaN(count) || count < 0) {
                        return ctx.reply(adminInputMessages.positiveNumberRequired);
                    }
                    await adminSetImageBalance(targetId, count);
                    delete userState[userId];
                    await ctx.reply(adminInputMessages.imageBalanceUpdated);
                    return renderUserManagePanel(ctx, targetId);
                }
                if (userState[userId] === 'WAITING_MU_MSG') {
                    delete userState[userId];
                    try {
                        await bot.telegram.sendMessage(
                            targetId,
                            adminInputMessages.adminMessage(text),
                            { parse_mode: 'HTML' },
                        );
                        await ctx.reply(adminInputMessages.messageDelivered);
                    } catch (e) {
                        await ctx.reply(adminInputMessages.deliveryFailed);
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
            if (parts.length !== CATALOG.fields || parts.some((p) => Number.isNaN(Number(p)))) {
                return ctx.reply(adminInputMessages.invalidPackage);
            }
            parsePackage(parts.join('_'));
            await setSetting(`pkg_${pkgType}`, `${parts[0]}_${parts[1]}_${parts[2]}_${parts[3]}`);
            delete userState[userId];
            await ctx.reply(adminInputMessages.packageUpdated(pkgType.toUpperCase()));
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
                const num = nonNegativeInteger(text.trim(), fieldNames.value);
                if (isNaN(num) || num < 1) {
                    return ctx.reply(adminInputMessages.numberRequired);
                }
                await setSetting(settingKey, num);
            } else {
                await setSetting(settingKey, text.trim());
            }
            delete userState[userId];
            await ctx.reply(adminInputMessages.saved, { parse_mode: 'Markdown' });
            return renderAdminPanel(ctx, false);
        }
        if (userId === ADMIN_ID && userState[userId] === 'WAITING_NEW_PROMO_CODE') {
            const code = text.trim().replace(/\s+/g, '_').toUpperCase();
            adminPromoDraft[userId] = {
                code: code,
                uses: PROMOTIONS.defaultUses,
                textReward: PROMOTIONS.defaultTextReward,
                imgReward: PROMOTIONS.defaultImageReward,
                discount: PROMOTIONS.defaultDiscount,
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
            const num = nonNegativeInteger(text.trim(), fieldNames.value);
            if (isNaN(num) || num < 0) {
                return ctx.reply(adminInputMessages.positiveNumberRequired);
            }
            const draft = adminPromoDraft[userId];
            if (!draft) {
                return ctx.reply(adminInputMessages.missingDraft);
            }
            if (field === 'uses') {
                draft.uses = num;
            } else if (field === 'text') {
                draft.textReward = num;
            } else if (field === 'img') {
                draft.imgReward = num;
            } else if (field === 'disc') {
                draft.discount = num;
            }
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
            const num = nonNegativeInteger(text.trim(), fieldNames.value);
            if (isNaN(num) || num < 0) {
                return ctx.reply(adminInputMessages.positiveNumberRequired);
            }
            await updatePromoField(id, field, num);
            delete userState[userId];
            return ctx.reply(adminInputMessages.promoUpdated, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: adminInputMessages.backToPromo, callback_data: `p_manage_${id}` }],
                    ],
                },
            });
        }
        if (userId === ADMIN_ID && userState[userId] === 'WAITING_FOR_BROADCAST') {
            userState[userId] = 'WAITING_FOR_BROADCAST_BTN';
            adminBroadcastMsg[userId] = { type: 'text', text: text, btn: 'none' };
            return ctx.reply(adminInputMessages.broadcastButtonPrompt, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: commonMessages.profile,
                                callback_data: 'broadcast_btn_profile',
                            },
                            { text: commonMessages.aiSettings, callback_data: 'broadcast_btn_ai' },
                        ],
                        [
                            { text: commonMessages.referrals, callback_data: 'broadcast_btn_refs' },
                            { text: commonMessages.help, callback_data: 'broadcast_btn_help' },
                        ],
                        [{ text: commonMessages.store, callback_data: 'broadcast_btn_store' }],
                        [{ text: commonMessages.noButton, callback_data: 'broadcast_btn_none' }],
                        [{ text: commonMessages.cancel, callback_data: 'cancel_input' }],
                    ],
                },
            });
        }
        return next();
    });
}
