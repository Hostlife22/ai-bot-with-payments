import type { Runtime } from '@contracts/runtime';
import { required } from '@domain/validation';
import { actorId } from '@telegram/context';

export function registerBroadcasts(runtime: Runtime) {
    const { bot, repository, config, sessions, queues } = runtime;
    const ADMIN_ID = config.adminId;
    const { userState, adminBroadcastMsg } = sessions;
    const { broadcastQueue } = queues;
    const { getAllUserIds } = repository;
    bot.action(/broadcast_btn_(.+)/, async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const btnType = required(ctx.match[1], 'Invalid callback data');
        const message = adminBroadcastMsg[actorId(ctx)];
        if (!message) return ctx.answerCbQuery('Ошибка: текст рассылки потерян');
        message.btn = btnType;
        userState[actorId(ctx)] = 'CONFIRM_BROADCAST';
        const msgData = message;
        let previewText = `🔍 *Предпросмотр рассылки:*\n\n`;
        if (msgData.type === 'text') previewText += msgData.text;
        else previewText += `[Медиа: ${msgData.type}] ` + (msgData.caption || '');
        previewText += `\n\nКнопка: ${btnType}\n_Начинаем отправку всем пользователям?_`;
        const kb = [];
        if (btnType !== 'none') {
            const btnNames: Record<string, string> = {
                profile: '👤 Профиль',
                ai: '🧠 Настройка ИИ',
                refs: '👥 Рефералы',
                help: '🆘 Помощь',
                store: '⭐️ Магазин',
            };
            kb.push([{ text: btnNames[btnType] || btnType, callback_data: 'ignore' }]);
        }
        kb.push([{ text: '✅ Отправить всем', callback_data: 'confirm_broadcast' }]);
        kb.push([{ text: '❌ Отмена', callback_data: 'cancel_input' }]);
        await ctx.answerCbQuery();
        if (msgData.type === 'photo') {
            return ctx.replyWithPhoto(msgData.file_id, {
                caption: previewText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb },
            });
        } else if (msgData.type === 'video') {
            return ctx.replyWithVideo(msgData.file_id, {
                caption: previewText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb },
            });
        } else if (msgData.type === 'document') {
            return ctx.replyWithDocument(msgData.file_id, {
                caption: previewText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb },
            });
        } else if (msgData.type === 'animation') {
            return ctx.replyWithAnimation(msgData.file_id, {
                caption: previewText,
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb },
            });
        } else {
            return ctx.editMessageText(previewText, {
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: kb },
            });
        }
    });
    bot.action('confirm_broadcast', async (ctx) => {
        if (actorId(ctx) !== ADMIN_ID) return;
        const msgData = adminBroadcastMsg[actorId(ctx)];
        if (!msgData) return ctx.answerCbQuery('Ошибка: текст не найден');
        delete adminBroadcastMsg[actorId(ctx)];
        const userIds = await getAllUserIds();
        for (const uid of userIds) {
            await broadcastQueue.add('send-msg', { userId: uid, msgData: msgData });
        }
        await ctx.answerCbQuery('Рассылка запущена!');
        return ctx.reply(
            `✅ Рассылка запущена в фоновом режиме!\nСообщений в очереди: *${userIds.length}*`,
            { parse_mode: 'Markdown' },
        );
    });
    return {};
}
