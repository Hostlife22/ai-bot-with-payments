import type { Runtime } from '@contracts/runtime';
import { registerBroadcasts } from '@admin/broadcasts';
import { registerPromotions } from '@admin/promotions';
import { registerSettings } from '@admin/settings';
import { registerUsers } from '@admin/users';

export function registerAdmin(runtime: Runtime) {
    const promotions = registerPromotions(runtime);
    const settings = registerSettings(runtime);
    const users = registerUsers(runtime);
    registerBroadcasts(runtime);
    return { ...promotions, ...settings, ...users };
}
