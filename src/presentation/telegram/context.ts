import type { Context } from 'telegraf';

import { required } from '@domain/validation';

export function actorId(ctx: Context): number {
    return required(ctx.from, 'Telegram user is required').id;
}
export function chatId(ctx: Context): number {
    return required(ctx.chat, 'Telegram chat is required').id;
}
