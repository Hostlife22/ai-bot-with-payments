import { CATALOG } from '@constants/catalog';
import { DEFAULT_PACKAGES } from '@constants/packages';
import { USER_REWARDS } from '@constants/users';

export const adminSettingsMessages = {
    allUsers: '👥 Все юзеры',
    apiCost: (total: string): string => `└ Расход API: $${total}\n\n`,
    bonusChannelId: '📢 Канал бонуса (ID)',
    bonusChannelUrl: '🔗 Ссылка бонуса',
    broadcast: '📢 Рассылка',
    canceled: 'Действие отменено',
    channelIdInstructions: `<b>ID:</b> <code>@username</code> или <code>-100...</code> (бот должен быть админом в канале!)\n`,
    channelInstructionsHeading: `🔗 <b>Для канала бонуса:</b>\n`,
    channelUrlInstructions: `<b>Ссылка:</b> <code>https://t.me/...</code> для кнопки перехода.`,
    disabled: 'выключен',
    editAgreement: '📜 Соглашение',
    editPackage: (pkg: string): string =>
        `✏️ Редактирование пакета *${pkg}*.\n\nВведите ${CATALOG.fields} числа через пробел:\n\`Звезды Рубли Тексты Фото\`\n\n_Например (35 звёзд, 50 руб, 50 текстов, 0 фото):_\n\`35 50 50 0\``,
    enabled: 'включен',
    enableFreeMode: '🟢 Включить Free Mode',
    enableLimits: '🔴 Включить лимиты',
    enterBroadcast:
        '📢 Отправьте мне текст сообщения для массовой рассылки (поддерживается разметка Markdown):',
    enterSetting: '💬 Отправьте новое значение в чат:',
    faq: '❓ FAQ',
    financesHeading: `💸 *Финансы:*\n`,
    findUser: '🔍 Найти по ID',
    freeModeChanged: (currentStatus: string): string => `Бесплатный режим ${currentStatus}`,
    freeModeStatus: '🟢 Free Mode (Безлимит)',
    funnelHeading: `🧲 *Воронка конверсии:*\n`,
    funnelOpened: (opened: number, pOpened: number): string =>
        `3️⃣ Открыли магазин: ${opened} чел. (${pOpened}%)\n`,
    funnelPaid: (paid: number, pPaid: number): string =>
        `4️⃣ Оплатили пакет: ${paid} чел. (${pPaid}%)\n\n`,
    funnelSpent: (spent: number, pSpent: number): string =>
        `2️⃣ Потратили лимит: ${spent} чел. (${pSpent}%)\n`,
    funnelTotal: (total: number): string => `1️⃣ Зашли в бота: ${total} чел.\n`,
    heading: `👑 *Панель администратора*\n\n`,
    htmlBoldExample: `<code>&lt;b&gt;жирный&lt;/b&gt;</code>\n`,
    htmlInstructions: `<i>Поддерживаются HTML-теги:</i>\n`,
    htmlItalicExample: `<code>&lt;i&gt;курсив&lt;/i&gt;</code>\n`,
    htmlLinkExample: `<code>&lt;a href="ссылка"&gt;текст&lt;/a&gt;</code>\n\n`,
    image15Button: `📸 ${DEFAULT_PACKAGES.i15.img} шт.`,
    image50Button: `📸 ${DEFAULT_PACKAGES.i50.img} шт.`,
    image5Button: `📸 ${DEFAULT_PACKAGES.i5.img} шт.`,
    limitedModeStatus: '🔴 Лимиты включены',
    limitsReset: `Лимиты всем пользователям успешно сброшены до ${USER_REWARDS.initialTexts} текстов и ${USER_REWARDS.initialImages} фото!`,
    modeSummary: (freeMode: string): string => `⚙️ *Режим работы:* ${freeMode}`,
    packageSettings:
        '📦 *Настройка цен и пакетов*\n\nВыберите пакет для изменения его стоимости и лимитов:',
    prices: '📦 Цены',
    promotions: '🎁 Промокоды',
    resetLimits: '🔄 Сбросить лимиты всем (Подарок)',
    revenue: (rubTotal: string | number, starsTotal: string | number): string =>
        `├ Выручка: ${rubTotal} RUB | ${starsTotal} XTR\n`,
    starsUrl: '🔗 Ссылка на "Звезды"',
    supportUrl: '🎧 Саппорт (URL)',
    text200Button: `💬 ${DEFAULT_PACKAGES.t200.text} шт.`,
    text500Button: `💬 ${DEFAULT_PACKAGES.t500.text} шт.`,
    text50Button: `💬 ${DEFAULT_PACKAGES.t50.text} шт.`,
    texts: '📝 Тексты',
    textSettingsHeading: `📝 <b>Настройка текстов и ссылок</b>\n\n`,
    usersDay: (day: string): string => `├ За день: ${day}\n`,
    usersHeading: `📊 *Юзеры:*\n`,
    usersTotal: (total: string): string => `└ Всего: ${total}\n\n`,
    usersWeek: (week: string): string => `├ За неделю: ${week}\n`,
} as const;
