import { Markup, type Context, type Telegraf } from 'telegraf';

import { aiMenuMessages } from '@messages/ai-menu';
import { commonMessages } from '@messages/common';
import { errorMessages } from '@messages/errors';
import { promptTemplates } from '@messages/prompts';
import type { Repository } from '@contracts/repositories';
import type { UserStates } from '@contracts/sessions';
import type { ModeNames } from '@contracts/themes';
import { isRoleMode } from '@domain/roles';
import { required } from '@domain/validation';
import { actorId } from '@telegram/context';

export function setupAi(
    bot: Telegraf,
    userState: UserStates,
    modeNames: ModeNames,
    repository: Repository,
) {
    const { setUserPrompt, clearHistory } = repository;
    bot.hears(commonMessages.aiSettings, (ctx) => showAi(ctx, modeNames));
    bot.action('menu_ai', async (ctx) => {
        await ctx.answerCbQuery();
        return showAi(ctx, modeNames);
    });
    bot.action(
        /prompt_(default|psych|coder|eng|flirthot|flirt|romance|bold|dom|hardcore|truth_dare)/,
        async (ctx) => {
            const mode = required(ctx.match[1], errorMessages.invalidCallback);
            if (!isRoleMode(mode) || mode === 'custom')
                return ctx.answerCbQuery(aiMenuMessages.unknownMode);
            const text = required(promptTemplates[`prompt_${mode}`]);
            const modeName = modeNames[mode] || commonMessages.unknown;
            const userId = actorId(ctx);
            await setUserPrompt(userId, text, mode);
            await clearHistory(userId);
            await ctx.answerCbQuery(aiMenuMessages.modeChangedNotification(modeName));
            const msg = aiMenuMessages.modeChanged(modeName);
            return ctx
                .editMessageText(msg, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: commonMessages.back, callback_data: 'menu_ai' }],
                        ],
                    },
                })
                .catch(() => {});
        },
    );
    bot.action('prompt_custom', async (ctx) => {
        const userId = actorId(ctx);
        userState[userId] = 'WAITING_FOR_CUSTOM_PROMPT';
        await ctx.answerCbQuery();
        return ctx
            .editMessageText(
                aiMenuMessages.customPromptHeading +
                    aiMenuMessages.customPromptInstructions +
                    aiMenuMessages.customPromptExamples +
                    aiMenuMessages.customPromptLimit,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: commonMessages.cancel, callback_data: 'cancel_input' }],
                        ],
                    },
                },
            )
            .catch(() => {});
    });
    bot.hears(commonMessages.clearHistory, async (ctx) => {
        await clearHistory(actorId(ctx));
        return ctx.reply(aiMenuMessages.historyCleared);
    });
    async function showAi(ctx: Context, modeNames: ModeNames) {
        const user = await repository.requireUser(actorId(ctx));
        const currentMode = user.roleplay_mode || 'flirt';
        const modeName = modeNames[currentMode] || commonMessages.unknown;
        const msg = aiMenuMessages.settings(modeName);
        const kb = Markup.inlineKeyboard([
            [
                Markup.button.callback(aiMenuMessages.romance, 'prompt_romance'),
                Markup.button.callback(aiMenuMessages.bold, 'prompt_bold'),
            ],
            [
                Markup.button.callback(aiMenuMessages.dominant, 'prompt_dom'),
                Markup.button.callback(aiMenuMessages.hardcore, 'prompt_hardcore'),
            ],
            [Markup.button.callback(aiMenuMessages.truthOrDare, 'prompt_truth_dare')],
            [Markup.button.callback(aiMenuMessages.defaultMode, 'prompt_default')],
            [
                Markup.button.callback(aiMenuMessages.psychologist, 'prompt_psych'),
                Markup.button.callback(aiMenuMessages.programmer, 'prompt_coder'),
            ],
            [Markup.button.callback(aiMenuMessages.englishTeacher, 'prompt_eng')],
            [Markup.button.callback(aiMenuMessages.flirthot, 'prompt_flirthot')],
            [Markup.button.callback(aiMenuMessages.flirt, 'prompt_flirt')],
            [Markup.button.callback(aiMenuMessages.customPrompt, 'prompt_custom')],
        ]);
        if (ctx.callbackQuery) {
            return ctx
                .editMessageText(msg, { parse_mode: 'Markdown', reply_markup: kb.reply_markup })
                .catch(() => {});
        }
        return ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb.reply_markup });
    }
}
