import type { Context } from 'telegraf';

import { errorMessages } from '@messages/errors';
import { required } from '@domain/validation';

export function actorId(ctx: Context): number {
    return required(ctx.from, errorMessages.telegramUserRequired).id;
}

export function chatId(ctx: Context): number {
    return required(ctx.chat, errorMessages.telegramChatRequired).id;
}
