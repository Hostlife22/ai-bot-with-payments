import type { AiJob } from '@contracts/jobs';
import { record } from '@domain/validation';

export function parseAiJob(value: unknown): AiJob {
    const data = record(value);
    const id = data.userId;
    const userId =
        typeof id === 'number' ? id : typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN;
    if (
        !Number.isSafeInteger(userId) ||
        userId <= 0 ||
        typeof data.text !== 'string' ||
        !data.text ||
        typeof data.chatId !== 'number' ||
        !Number.isSafeInteger(data.chatId) ||
        typeof data.shouldDecrement !== 'boolean'
    )
        throw new Error('Invalid AI queue payload');
    const job: AiJob = {
        userId,
        text: data.text,
        chatId: data.chatId,
        shouldDecrement: data.shouldDecrement,
    };
    if (data.tempMsgId !== undefined) {
        if (
            typeof data.tempMsgId !== 'number' ||
            !Number.isSafeInteger(data.tempMsgId) ||
            data.tempMsgId <= 0
        )
            throw new Error('Invalid temporary message ID');
        job.tempMsgId = data.tempMsgId;
    }
    return job;
}
