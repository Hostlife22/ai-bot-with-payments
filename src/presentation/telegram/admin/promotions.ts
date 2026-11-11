import { Markup, type Context } from 'telegraf';

import { DECIMAL_RADIX } from '@constants/numbers';
import { PROMOTIONS } from '@constants/promotions';
import { UI_FORMAT } from '@constants/telegram';
import { adminPromoMessages } from '@messages/admin-promotions';
import { commonMessages } from '@messages/common';
import { errorMessages } from '@messages/errors';
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
        if (actorId(ctx) !== ADMIN_ID) {
            return;
        }
        const promos = await getAllPromocodes();
        let msg = adminPromoMessages.listHeading;
        const kb = [];
        if (promos.length === 0) {
            msg += adminPromoMessages.emptyList;
        } else {
            promos.forEach((p) => {
                const statusIcon = p.is_active
                    ? commonMessages.successIcon
                    : commonMessages.failureIcon;
                const usesDone = p.max_uses_total - p.uses_left;
                msg += adminPromoMessages.listCode(statusIcon, p.code);
                msg += adminPromoMessages.usageSummary(usesDone, p.max_uses_total);
                if (p.discount_amount > 0) {
                    msg += adminPromoMessages.discountSummary(p.discount_amount);
                }
                if (p.text_reward > 0) {
                    msg += adminPromoMessages.textRewardSummary(p.text_reward);
                }
                msg += `\n`;
                kb.push([
                    Markup.button.callback(
                        adminPromoMessages.codeButton(p.code),
                        `p_manage_${p.id}`,
                    ),
                ]);
            });
        }
        kb.push([Markup.button.callback(adminPromoMessages.create, 'p_create')]);
        kb.push([Markup.button.callback(commonMessages.back, 'admin_back')]);
        return ctx
            .editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } })
            .catch(() => {});
    });

    bot.action(/p_manage_(\d+)/, async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) {
            return;
        }
        const promoId = parseInt(
            required(ctx.match[1], errorMessages.invalidCallback),
            DECIMAL_RADIX,
        );
        const p = await getPromocodeById(promoId);
        if (!p) {
            return ctx.answerCbQuery(adminPromoMessages.notFound);
        }
        const usesDone = p.max_uses_total - p.uses_left;
        const statusText = p.is_active ? commonMessages.active : adminPromoMessages.inactive;
        const statusIcon = p.is_active ? commonMessages.successIcon : commonMessages.failureIcon;
        const newOnlyIcon = p.is_new_users_only
            ? commonMessages.successIcon
            : commonMessages.failureIcon;
        const dateStr = new Date(p.created_at).toLocaleDateString(UI_FORMAT.locale);
        const msg =
            adminPromoMessages.manageHeading +
            adminPromoMessages.codeSummary(p.code) +
            adminPromoMessages.statusSummary(statusIcon, statusText) +
            adminPromoMessages.usageSummary(usesDone, p.max_uses_total) +
            adminPromoMessages.newOnlySummary(newOnlyIcon) +
            adminPromoMessages.createdSummary(dateStr) +
            adminPromoMessages.rewardsHeading +
            adminPromoMessages.rewardsSummary(p.text_reward, p.img_reward, p.discount_amount);
        const kb = [
            [Markup.button.callback(adminPromoMessages.editRewards, `p_edit_bonuses_${p.id}`)],
            [Markup.button.callback(adminPromoMessages.toggleStatus, `p_tgl_stat_${p.id}`)],
            [
                Markup.button.callback(
                    adminPromoMessages.newOnlyButton(newOnlyIcon),
                    `p_tgl_new_${p.id}`,
                ),
            ],
            [Markup.button.callback(adminPromoMessages.delete, `p_del_${p.id}`)],
            [Markup.button.callback(adminPromoMessages.backToList, 'admin_promo_list')],
        ];
        return ctx
            .editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: kb } })
            .catch(() => {});
    });

    bot.action(/p_tgl_stat_(\d+)/, async (ctx) => {
        await togglePromoStatus(
            parseInt(required(ctx.match[1], errorMessages.invalidCallback), DECIMAL_RADIX),
        );
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: {
                ...ctx.callbackQuery,
                data: `p_manage_${required(ctx.match[1], errorMessages.invalidCallback)}`,
            },
        });
    });

    bot.action(/p_tgl_new_(\d+)/, async (ctx) => {
        await togglePromoNewUsersOnly(
            parseInt(required(ctx.match[1], errorMessages.invalidCallback), DECIMAL_RADIX),
        );
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: {
                ...ctx.callbackQuery,
                data: `p_manage_${required(ctx.match[1], errorMessages.invalidCallback)}`,
            },
        });
    });

    bot.action(/p_del_(\d+)/, async (ctx) => {
        await deletePromocode(
            parseInt(required(ctx.match[1], errorMessages.invalidCallback), DECIMAL_RADIX),
        );
        await ctx.answerCbQuery(adminPromoMessages.deleted, { show_alert: true });
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: { ...ctx.callbackQuery, data: 'admin_promo_list' },
        });
    });

    bot.action(/p_edit_bonuses_(\d+)/, async (ctx) => {
        const id = required(ctx.match[1], errorMessages.invalidCallback);
        const kb = [
            [
                Markup.button.callback(adminPromoMessages.textReward, `p_ed_text_${id}`),
                Markup.button.callback(adminPromoMessages.imageReward, `p_ed_img_${id}`),
            ],
            [
                Markup.button.callback(adminPromoMessages.discountReward, `p_ed_disc_${id}`),
                Markup.button.callback(adminPromoMessages.usageLimit, `p_ed_uses_${id}`),
            ],
            [Markup.button.callback(commonMessages.back, `p_manage_${id}`)],
        ];
        return ctx.editMessageText(adminPromoMessages.selectField, {
            reply_markup: { inline_keyboard: kb },
        });
    });

    bot.action(/p_ed_(text|img|disc|uses)_(\d+)/, async (ctx) => {
        const field = required(ctx.match[1], errorMessages.invalidCallback);
        const id = required(ctx.match[2], errorMessages.invalidCallback);
        userState[actorId(ctx)] = `WAITING_PEDIT_${field.toUpperCase()}_${id}`;
        await ctx.answerCbQuery();
        return ctx.reply(adminPromoMessages.enterNumber, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: commonMessages.cancelPlain, callback_data: `p_manage_${id}` }],
                ],
            },
        });
    });

    bot.action('p_create', async (ctx) => {
        userState[actorId(ctx)] = 'WAITING_NEW_PROMO_CODE';
        await ctx.answerCbQuery();
        return ctx.editMessageText(adminPromoMessages.enterCode, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: commonMessages.cancelPlain, callback_data: 'admin_promo_list' }],
                ],
            },
        });
    });

    async function renderPromoDraft(ctx: Context) {
        const draft = adminPromoDraft[actorId(ctx)];
        if (!draft) {
            return ctx.reply(adminPromoMessages.invalidDraft, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: adminPromoMessages.menu, callback_data: 'admin_promo_list' }],
                    ],
                },
            });
        }
        const msg =
            adminPromoMessages.draftHeading +
            adminPromoMessages.draftCode(draft.code) +
            adminPromoMessages.draftUsageLimit(draft.uses) +
            adminPromoMessages.draftNewOnly(
                draft.newOnly ? commonMessages.successIcon : commonMessages.failureIcon,
            ) +
            adminPromoMessages.rewardsHeading +
            adminPromoMessages.draftRewards(draft.textReward, draft.imgReward, draft.discount) +
            adminPromoMessages.saveInstructions;
        const kb = [
            [
                Markup.button.callback(
                    adminPromoMessages.draftTextButton(draft.textReward),
                    'pdraft_text',
                ),
                Markup.button.callback(
                    adminPromoMessages.draftImageButton(draft.imgReward),
                    'pdraft_img',
                ),
            ],
            [
                Markup.button.callback(
                    adminPromoMessages.draftDiscountButton(draft.discount),
                    'pdraft_disc',
                ),
                Markup.button.callback(
                    adminPromoMessages.draftUsesButton(draft.uses),
                    'pdraft_uses',
                ),
            ],
            [
                Markup.button.callback(
                    adminPromoMessages.draftNewOnlyButton(
                        draft.newOnly ? commonMessages.successIcon : commonMessages.failureIcon,
                    ),
                    'pdraft_newonly',
                ),
            ],
            [Markup.button.callback(adminPromoMessages.saveDraft, 'pdraft_save')],
            [Markup.button.callback(commonMessages.cancelPlain, 'admin_promo_list')],
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
        const field = required(ctx.match[1], errorMessages.invalidCallback);
        userState[actorId(ctx)] = `WAITING_PDRAFT_${field.toUpperCase()}`;
        await ctx.answerCbQuery();
        return ctx.reply(adminPromoMessages.enterNumber, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: commonMessages.cancelPlain, callback_data: 'pdraft_cancel_input' }],
                ],
            },
        });
    });

    bot.action('pdraft_newonly', async (ctx) => {
        const draft = adminPromoDraft[actorId(ctx)];
        if (draft) {
            draft.newOnly = !draft.newOnly;
        }
        return renderPromoDraft(ctx);
    });

    bot.action('pdraft_cancel_input', async (ctx) => {
        delete userState[actorId(ctx)];
        await ctx.deleteMessage().catch(() => {});
        return renderPromoDraft(ctx);
    });

    bot.action('pdraft_save', async (ctx) => {
        const draft = adminPromoDraft[actorId(ctx)];
        if (!draft) {
            return ctx.answerCbQuery(commonMessages.error);
        }
        await createPromocode(
            draft.code,
            draft.uses,
            draft.textReward,
            draft.imgReward,
            draft.discount,
            PROMOTIONS.defaultUsesPerUser,
            draft.newOnly,
        );
        delete adminPromoDraft[actorId(ctx)];
        await ctx.answerCbQuery(adminPromoMessages.saved, { show_alert: true });
        return bot.handleUpdate({
            ...ctx.update,
            callback_query: { ...ctx.callbackQuery, data: 'admin_promo_list' },
        });
    });

    return { renderPromoDraft };
}
