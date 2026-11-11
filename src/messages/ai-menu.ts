import { AI_LIMITS } from '@constants/ai';

export const aiMenuMessages = {
    bold: '😏 Дерзкая',
    customPrompt: '⚙️ Свой промпт',
    customPromptExamples: `_Например: "Отвечай только стихами" или "Веди себя как 18 летняя студентка"_\n\n`,
    customPromptHeading: `⚙️ *Свой системный промпт*\n\n`,
    customPromptInstructions: `Отправьте мне текст, который опишет, как бот должен с вами общаться.\n\n`,
    customPromptLimit: `👇 *Жду ваш текст (до ${AI_LIMITS.promptCharacters} символов):*`,
    defaultMode: '🤖 Обычный AI (GPT)',
    dominant: '👠 Доминантка',
    englishTeacher: '🇬🇧 Учитель English',
    flirt: '🌸 Милая девушка',
    flirthot: '🌶 Виртуальная девушка (18+)',
    hardcore: '🖤 Хардкор',
    historyCleared: '🧹 Память бота очищена. Начинаем с чистого листа!',
    modeChanged: (modeName: string): string =>
        `✅ *Режим успешно изменен!*\n\n_Память прошлого диалога очищена._\n\n*Текущий режим:*\n🎭 _${modeName}_`,
    modeChangedNotification: (modeName: string): string => `Режим изменен: ${modeName}`,
    programmer: '💻 Программист',
    psychologist: '🧘‍♀️ Психолог',
    romance: '💕 Романтика',
    settings: (modeName: string): string =>
        `🧠 *Настройки ИИ*\n\nВыберите роль и характер для бота. При смене режима текущий диалог будет очищен.\n\n*Текущий режим:*\n🎭 _${modeName}_`,
    truthOrDare: '🎲 Правда или действие',
    unknownMode: 'Неизвестный режим',
} as const;
