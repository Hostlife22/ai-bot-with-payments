import { Markup, type Context } from 'telegraf';
import type { InlineKeyboardMarkup as Keyboard } from 'telegraf/types';

import type { ShopMenuDependencies } from '@contracts/shop';
import { required } from '@domain/validation';
import { actorId } from '@telegram/context';

export function registerMenuShop(runtime: ShopMenuDependencies) {
    const { bot, repository, catalog } = runtime;
    const { getPackageData } = catalog;
    const { getSetting, setStoreOpened } = repository;
    async function sendInvoiceHelper(ctx: Context) {
        try {
            const user = await repository.requireUser(actorId(ctx));
            const discount = user.current_discount || 0;
            const buyStarsUrl = await getSetting('buy_stars_url', 'Не задан');
            const t50 = await getPackageData('t50');
            const t200 = await getPackageData('t200');
            const t500 = await getPackageData('t500');
            const i5 = await getPackageData('i5');
            const i15 = await getPackageData('i15');
            const i50 = await getPackageData('i50');
            const lite = await getPackageData('lite');
            const medium = await getPackageData('medium');
            const hard = await getPackageData('hard');
            const calcPrice = (price: number) =>
                discount > 0 ? Math.max(1, Math.round(price * (1 - discount / 100))) : price;
            const msg =
                `🛒 *Магазин пакетов*\n\n` +
                (discount > 0 ? `🎉 *Твоя персональная скидка: ${discount}%*\n\n` : ``) +
                `💬 *Только сообщения:*\n` +
                `• 50 шт. — ${calcPrice(t50.rub)}₽ | ${calcPrice(t50.stars)}⭐️\n` +
                `• 200 шт. — ${calcPrice(t200.rub)}₽ | ${calcPrice(t200.stars)}⭐️\n` +
                `• 500 шт. — ${calcPrice(t500.rub)}₽ | ${calcPrice(t500.stars)}⭐️\n\n` +
                `📸 *Только генерация фото:*\n` +
                `• 5 шт. — ${calcPrice(i5.rub)}₽ | ${calcPrice(i5.stars)}⭐️\n` +
                `• 15 шт. — ${calcPrice(i15.rub)}₽ | ${calcPrice(i15.stars)}⭐️\n` +
                `• 50 шт. — ${calcPrice(i50.rub)}₽ | ${calcPrice(i50.stars)}⭐️\n\n` +
                `🎁 *Комбо (Сообщения + Фото):*\n` +
                `• Lite (50💬 + 5📸) — ${calcPrice(lite.rub)}₽ | ${calcPrice(lite.stars)}⭐️\n` +
                `• Medium (200💬 + 20📸) — ${calcPrice(medium.rub)}₽ | ${calcPrice(medium.stars)}⭐️\n` +
                `• Hard (500💬 + 50📸) — ${calcPrice(hard.rub)}₽ | ${calcPrice(hard.stars)}⭐️\n`;
            const kb: Keyboard['inline_keyboard'] = [
                [
                    Markup.button.callback(`💬 50`, `select_pay_t50`),
                    Markup.button.callback(`💬 200`, `select_pay_t200`),
                    Markup.button.callback(`💬 500`, `select_pay_t500`),
                ],
                [
                    Markup.button.callback(`📸 5`, `select_pay_i5`),
                    Markup.button.callback(`📸 15`, `select_pay_i15`),
                    Markup.button.callback(`📸 50`, `select_pay_i50`),
                ],
                [
                    Markup.button.callback(`🎁 Lite`, `select_pay_lite`),
                    Markup.button.callback(`🎁 Medium`, `select_pay_medium`),
                    Markup.button.callback(`🎁 Hard`, `select_pay_hard`),
                ],
            ];
            if (buyStarsUrl !== 'Не задан' && buyStarsUrl !== '') {
                kb.push([Markup.button.url('⭐️ Где купить звезды?', buyStarsUrl)]);
            }
            if (ctx.callbackQuery) {
                return await ctx.editMessageText(msg, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: kb },
                });
            } else {
                return await ctx.reply(msg, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: kb },
                });
            }
        } catch (e) {
            console.error('[МАГАЗИН ОШИБКА ОТРИСОВКИ]:', e);
            return ctx.reply('❌ Произошла ошибка. Обратитесь к администратору.');
        }
    }
    bot.command('buy', sendInvoiceHelper);
    bot.action('trigger_buy', async (ctx) => {
        await setStoreOpened(actorId(ctx)).catch(() => {});
        await ctx.answerCbQuery().catch(() => {});
        return sendInvoiceHelper(ctx);
    });
    bot.action(/select_pay_([a-z0-9]+)/, async (ctx) => {
        try {
            const user = await repository.requireUser(actorId(ctx));
            const discount = user.current_discount || 0;
            const pkgName = required(ctx.match[1], 'Invalid callback data');
            const p = await getPackageData(pkgName);
            let stars = p.stars;
            let rub = p.rub;
            if (discount > 0) {
                rub = Math.max(1, Math.round(rub * (1 - discount / 100)));
                stars = Math.max(1, Math.round(stars * (1 - discount / 100)));
            }
            let title = '';
            if (pkgName.startsWith('t')) title = 'Пакет Сообщений';
            else if (pkgName.startsWith('i')) title = 'Пакет Фото';
            else title = `Комбо-пакет ${pkgName.toUpperCase()}`;
            const kb = Markup.inlineKeyboard([
                [Markup.button.callback(`⭐️ Telegram Stars (${stars} ⭐️)`, `pay_stars_${pkgName}`)],
                [Markup.button.callback(`🇷🇺 СБП (QR) (${rub} ₽)`, `pay_platega_2_${pkgName}`)],
                [Markup.button.callback(`🪙 Криптовалюта (${rub} ₽)`, `pay_platega_13_${pkgName}`)],
                [Markup.button.callback(`🔙 Назад`, `trigger_buy`)],
            ]);
            return await ctx.editMessageText(`Выбран *${title}*:\nВыберите способ оплаты:`, {
                parse_mode: 'Markdown',
                ...kb,
            });
        } catch (e) {
            console.error('[МАГАЗИН ОШИБКА ВЫБОРА ОПЛАТЫ]:', e);
        }
    });
}
