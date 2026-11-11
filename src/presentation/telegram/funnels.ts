import { FUNNELS } from '@constants/promotions';
import { funnelMessages } from '@messages/funnels';
import { logMessages } from '@messages/logs';
import type { Runtime } from '@contracts/runtime';

export function registerFunnels(runtime: Runtime) {
    const { bot, repository, timers } = runtime;
    const {
        getUsersForRetargeting24h,
        mark24hPromoSent,
        getUsersForRetargetingStore,
        markStorePromoSent,
        createPromocode,
        getUsersForBonusNotify,
        markBonusNotified,
    } = repository;

    function startAutoFunnels() {
        timers.every(async () => {
            try {
                const inactive24h = await getUsersForRetargeting24h();
                for (const uid of inactive24h) {
                    try {
                        await bot.telegram.sendMessage(uid, funnelMessages.inactiveReminder);
                        await mark24hPromoSent(uid);
                        await new Promise((r) => setTimeout(r, FUNNELS.deliveryDelayMs));
                    } catch (e) {}
                }
                const cartAbandoners = await getUsersForRetargetingStore();
                for (const uid of cartAbandoners) {
                    try {
                        const promoCode =
                            FUNNELS.codePrefix +
                            uid +
                            '_' +
                            Math.floor(Math.random() * FUNNELS.codeSuffixRange);
                        await createPromocode(
                            promoCode,
                            FUNNELS.promoUses,
                            FUNNELS.promoTextReward,
                            FUNNELS.promoImageReward,
                            FUNNELS.promoDiscountPercent,
                        );
                        const msg = funnelMessages.storeReminder(promoCode);
                        await bot.telegram.sendMessage(uid, msg, { parse_mode: 'HTML' });
                        await markStorePromoSent(uid);
                        await new Promise((r) => setTimeout(r, FUNNELS.deliveryDelayMs));
                    } catch (e) {}
                }
                const bonusUsers = await getUsersForBonusNotify();
                for (const uid of bonusUsers) {
                    try {
                        await bot.telegram.sendMessage(uid, funnelMessages.bonusReminder, {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: funnelMessages.claimBonus,
                                            callback_data: 'menu_profile',
                                        },
                                    ],
                                ],
                            },
                        });
                        await markBonusNotified(uid);
                        await new Promise((r) => setTimeout(r, FUNNELS.deliveryDelayMs));
                    } catch (e) {}
                }
            } catch (e) {
                console.error(logMessages.funnelFailed, e);
            }
        }, FUNNELS.intervalMs);
    }

    startAutoFunnels();
}
