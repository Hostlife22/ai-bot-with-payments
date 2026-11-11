import type { Telegram } from 'telegraf';
import type { InlineKeyboardMarkup as Keyboard } from 'telegraf/types';

import { TELEGRAM_LIMITS, UTF16 } from '@constants/telegram';
import { commonMessages } from '@messages/common';
import { deliveryMessages } from '@messages/delivery';
import { errorMessages } from '@messages/errors';
import type { AiResponse } from '@contracts/conversation';
import type { AiJob } from '@contracts/jobs';

export function splitText(
    text: string,
    limit: number = TELEGRAM_LIMITS.messageCharacters,
): string[] {
    if (limit < 1) {
        throw new Error(errorMessages.invalidTextLimit);
    }
    const chunks: string[] = [];
    for (let offset = 0; offset < text.length;) {
        let end = Math.min(offset + limit, text.length);
        const code = text.charCodeAt(end - 1);
        if (
            end < text.length &&
            code >= UTF16.highSurrogateStart &&
            code <= UTF16.highSurrogateEnd
        ) {
            end--;
        }
        if (end === offset) {
            end++;
        }
        chunks.push(text.slice(offset, end));
        offset = end;
    }
    return chunks.length ? chunks : [deliveryMessages.emptyText];
}

export async function deliverResponse(
    telegram: Telegram,
    job: AiJob,
    response: AiResponse,
): Promise<void> {
    const reply_markup: Keyboard | undefined = response.showBuyButton
        ? { inline_keyboard: [[{ text: commonMessages.store, callback_data: 'trigger_buy' }]] }
        : undefined;
    const options = reply_markup ? { reply_markup } : {};
    if (response.photo) {
        const caption = splitText(response.text, TELEGRAM_LIMITS.captionCharacters)[0] ?? '';
        await telegram.sendPhoto(job.chatId, response.photo, { caption, ...options });
        const remainder = response.text.slice(caption.length);
        if (remainder) {
            for (const chunk of splitText(remainder)) {
                await telegram.sendMessage(job.chatId, chunk);
            }
        }
        if (job.tempMsgId) {
            await telegram.deleteMessage(job.chatId, job.tempMsgId).catch(() => undefined);
        }
        return;
    }
    const chunks = splitText(response.text);
    for (const [index, chunk] of chunks.entries()) {
        if (index === 0 && job.tempMsgId) {
            await telegram
                .editMessageText(job.chatId, job.tempMsgId, undefined, chunk, options)
                .catch(() => telegram.sendMessage(job.chatId, chunk, options));
        } else {
            await telegram.sendMessage(job.chatId, chunk, options);
        }
    }
}
