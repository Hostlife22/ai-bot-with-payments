import type { Context } from 'telegraf';

import type { Repository } from '@contracts/repositories';

export async function processReferral(
    ctx: Context & {
        payload: string;
    },
    repository: Repository,
): Promise<void> {
    if (!ctx.from) return;
    const userId = ctx.from.id;
    const match = /^ref_(\d+)$/.exec(ctx.payload);
    const candidate = match?.[1] ? Number(match[1]) : NaN;
    const referrerId =
        Number.isSafeInteger(candidate) &&
        candidate > 0 &&
        candidate !== userId &&
        (await repository.getUser(candidate))
            ? candidate
            : null;
    const awarded = await repository.registerReferral(userId, referrerId);
    if (awarded && referrerId !== null) {
        await ctx.telegram
            .sendMessage(
                referrerId,
                '🎉 По вашей ссылке зарегистрировался новый пользователь! Вам начислено +10 сообщений.',
            )
            .catch(() => undefined);
    }
}
