import { commonMessages } from '@messages/common';
import { logMessages } from '@messages/logs';
import type { Runtime } from '@contracts/runtime';
import { ValidationError } from '@domain/validation';

import { registerAdmin } from './admin.js';
import { registerConversation } from './conversation.js';
import { registerCore } from './core.js';
import { registerFunnels } from './funnels.js';
import { registerShop } from './shop.js';

export function registerTelegram(runtime: Runtime): void {
    const core = registerCore(runtime);
    const admin = registerAdmin(runtime);
    registerShop(runtime);
    registerConversation(runtime, core, admin);
    registerFunnels(runtime);
    runtime.bot.catch(async (error, ctx) => {
        if (error instanceof ValidationError) {
            await ctx.reply(error.message).catch(() => undefined);
            return;
        }
        console.error(logMessages.telegramUpdateFailed, { updateId: ctx.update.update_id, error });
        if (ctx.chat) await ctx.reply(commonMessages.unexpectedError).catch(() => undefined);
    });
}
