import type { PackageData } from '@contracts/billing';

export const shopMessages = {
    buyStars: '⭐️ Где купить звезды?',
    comboPrice: (name: string, pack: Readonly<PackageData>): string =>
        `• ${name} (${pack.text}💬 + ${pack.img}📸) — ${pack.rub}₽ | ${pack.stars}⭐️\n`,
    combosHeading: `🎁 *Комбо (Сообщения + Фото):*\n`,
    comboTitle: (pkgName: string): string => `Комбо-пакет ${pkgName}`,
    cryptoButton: (rub: number): string => `🪙 Криптовалюта (${rub} ₽)`,
    discount: (discount: number): string => `🎉 *Твоя персональная скидка: ${discount}%*\n\n`,
    heading: `🛒 *Магазин пакетов*\n\n`,
    imagePackageButton: (quantity: number): string => `📸 ${quantity}`,
    imagePackageTitle: 'Пакет Фото',
    imagesHeading: `📸 *Только генерация фото:*\n`,
    missingStarsUrl: 'Не задан',
    renderError: '❌ Произошла ошибка. Обратитесь к администратору.',
    resourcePrice: (quantity: number, pack: Readonly<PackageData>, sectionEnd = false): string =>
        `• ${quantity} шт. — ${pack.rub}₽ | ${pack.stars}⭐️\n${sectionEnd ? '\n' : ''}`,
    sbpButton: (rub: number): string => `🇷🇺 СБП (QR) (${rub} ₽)`,
    selectPayment: (title: string): string => `Выбран *${title}*:\nВыберите способ оплаты:`,
    starsButton: (stars: number): string => `⭐️ Telegram Stars (${stars} ⭐️)`,
    textPackageButton: (quantity: number): string => `💬 ${quantity}`,
    textPackageTitle: 'Пакет Сообщений',
    textsHeading: `💬 *Только сообщения:*\n`,
} as const;
