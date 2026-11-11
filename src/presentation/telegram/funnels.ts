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
        timers.every(
            async () => {
                try {
                    const inactive24h = await getUsersForRetargeting24h();
                    for (const uid of inactive24h) {
                        try {
                            await bot.telegram.sendMessage(
                                uid,
                                '🤫 Я приготовила для тебя кое-что особенное, но ты почему-то молчишь... Возвращайся в диалог!',
                            );
                            await mark24hPromoSent(uid);
                            await new Promise((r) => setTimeout(r, 50));
                        } catch (e) {}
                    }
                    const cartAbandoners = await getUsersForRetargetingStore();
                    for (const uid of cartAbandoners) {
                        try {
                            const promoCode =
                                'SALE20_' + uid + '_' + Math.floor(Math.random() * 1000);
                            await createPromocode(promoCode, 1, 5, 0, 20);
                            const msg = `Вижу, ты заглядывал в магазин 👀\n\n🔥 Я тут договорилась... держи персональный промокод на скидку 20% и +5 бесплатных текстов: <code>${promoCode}</code>\n\nДействует только для тебя, успей использовать!`;
                            await bot.telegram.sendMessage(uid, msg, { parse_mode: 'HTML' });
                            await markStorePromoSent(uid);
                            await new Promise((r) => setTimeout(r, 50));
                        } catch (e) {}
                    }
                    const bonusUsers = await getUsersForBonusNotify();
                    for (const uid of bonusUsers) {
                        try {
                            await bot.telegram.sendMessage(
                                uid,
                                `🎁 *Твой ежедневный бонус готов!*\n\nЗайди в профиль, чтобы забрать бесплатные сообщения.`,
                                {
                                    parse_mode: 'Markdown',
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                {
                                                    text: '👤 Забрать бонус',
                                                    callback_data: 'menu_profile',
                                                },
                                            ],
                                        ],
                                    },
                                },
                            );
                            await markBonusNotified(uid);
                            await new Promise((r) => setTimeout(r, 50));
                        } catch (e) {}
                    }
                } catch (e) {
                    console.error('[Автоворонка] Ошибка:', e);
                }
            },
            5 * 60 * 1000,
        );
    }
    startAutoFunnels();
}
