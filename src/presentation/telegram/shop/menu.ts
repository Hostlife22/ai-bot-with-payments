import { Markup, type Context } from 'telegraf';
import type { InlineKeyboardMarkup as Keyboard } from 'telegraf/types';

import { CATALOG } from '@constants/catalog';
import { PERCENT } from '@constants/numbers';
import { PLATEGA } from '@constants/payments';
import { commonMessages, packageNames } from '@messages/common';
import { errorMessages } from '@messages/errors';
import { logMessages } from '@messages/logs';
import { shopMessages } from '@messages/shop';
import type { PackageData } from '@contracts/billing';
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
            const buyStarsUrl = await getSetting('buy_stars_url', shopMessages.missingStarsUrl);
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
                discount > 0
                    ? Math.max(CATALOG.minimumPrice, Math.round(price * (1 - discount / PERCENT)))
                    : price;

            const displayPrice = (pack: PackageData): PackageData => ({
                ...pack,
                rub: calcPrice(pack.rub),
                stars: calcPrice(pack.stars),
            });

            const msg =
                shopMessages.heading +
                (discount > 0 ? shopMessages.discount(discount) : ``) +
                shopMessages.textsHeading +
                shopMessages.resourcePrice(t50.text, displayPrice(t50)) +
                shopMessages.resourcePrice(t200.text, displayPrice(t200)) +
                shopMessages.resourcePrice(t500.text, displayPrice(t500), true) +
                shopMessages.imagesHeading +
                shopMessages.resourcePrice(i5.img, displayPrice(i5)) +
                shopMessages.resourcePrice(i15.img, displayPrice(i15)) +
                shopMessages.resourcePrice(i50.img, displayPrice(i50), true) +
                shopMessages.combosHeading +
                shopMessages.comboPrice(packageNames.lite, displayPrice(lite)) +
                shopMessages.comboPrice(packageNames.medium, displayPrice(medium)) +
                shopMessages.comboPrice(packageNames.hard, displayPrice(hard));
            const kb: Keyboard['inline_keyboard'] = [
                [
                    Markup.button.callback(
                        shopMessages.textPackageButton(t50.text),
                        `select_pay_t50`,
                    ),
                    Markup.button.callback(
                        shopMessages.textPackageButton(t200.text),
                        `select_pay_t200`,
                    ),
                    Markup.button.callback(
                        shopMessages.textPackageButton(t500.text),
                        `select_pay_t500`,
                    ),
                ],
                [
                    Markup.button.callback(
                        shopMessages.imagePackageButton(i5.img),
                        `select_pay_i5`,
                    ),
                    Markup.button.callback(
                        shopMessages.imagePackageButton(i15.img),
                        `select_pay_i15`,
                    ),
                    Markup.button.callback(
                        shopMessages.imagePackageButton(i50.img),
                        `select_pay_i50`,
                    ),
                ],
                [
                    Markup.button.callback(commonMessages.litePackage, `select_pay_lite`),
                    Markup.button.callback(commonMessages.mediumPackage, `select_pay_medium`),
                    Markup.button.callback(commonMessages.hardPackage, `select_pay_hard`),
                ],
            ];
            if (buyStarsUrl !== shopMessages.missingStarsUrl && buyStarsUrl !== '') {
                kb.push([Markup.button.url(shopMessages.buyStars, buyStarsUrl)]);
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
            console.error(logMessages.shopRenderFailed, e);
            return ctx.reply(shopMessages.renderError);
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
            const pkgName = required(ctx.match[1], errorMessages.invalidCallback);
            const p = await getPackageData(pkgName);
            let stars = p.stars;
            let rub = p.rub;
            if (discount > 0) {
                rub = Math.max(CATALOG.minimumPrice, Math.round(rub * (1 - discount / PERCENT)));
                stars = Math.max(
                    CATALOG.minimumPrice,
                    Math.round(stars * (1 - discount / PERCENT)),
                );
            }
            let title = '';
            if (pkgName.startsWith('t')) {
                title = shopMessages.textPackageTitle;
            } else if (pkgName.startsWith('i')) {
                title = shopMessages.imagePackageTitle;
            } else {
                title = shopMessages.comboTitle(pkgName.toUpperCase());
            }
            const kb = Markup.inlineKeyboard([
                [Markup.button.callback(shopMessages.starsButton(stars), `pay_stars_${pkgName}`)],
                [
                    Markup.button.callback(
                        shopMessages.sbpButton(rub),
                        `pay_platega_${PLATEGA.methods.sbp}_${pkgName}`,
                    ),
                ],
                [
                    Markup.button.callback(
                        shopMessages.cryptoButton(rub),
                        `pay_platega_${PLATEGA.methods.crypto}_${pkgName}`,
                    ),
                ],
                [Markup.button.callback(commonMessages.returnBack, `trigger_buy`)],
            ]);
            return await ctx.editMessageText(shopMessages.selectPayment(title), {
                parse_mode: 'Markdown',
                ...kb,
            });
        } catch (e) {
            console.error(logMessages.shopPaymentSelectionFailed, e);
        }
    });
}
