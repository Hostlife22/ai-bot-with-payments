export const helpMessages = {
    accept: '✅ Принять',
    agreementPage: (text: string): string => `📄 <b>Пользовательское соглашение</b>\n\n${text}`,
    contactSupport: '🎧 Написать в поддержку',
    emptyFaq: 'Здесь пока пусто.',
    helpPage: (faqText: string): string =>
        `🆘 <b>Помощь и Поддержка</b>\n\n<b>FAQ:</b>\n${faqText}`,
    missingAgreement: '<i>Соглашение не задано.</i>',
    missingPolicy: '<i>Политика не задана.</i>',
    policyPage: (text: string): string => `📜 <b>Политика конфиденциальности</b>\n\n${text}`,
    termsAccepted: '✅ Условия приняты!',
    welcome: 'Добро пожаловать!',
} as const;
