import type { Runtime } from '@contracts/runtime';
import { registerMenuShop } from '@shop/menu';
import { registerPlategaShop } from '@shop/platega';
import { registerPollingShop } from '@shop/polling';
import { registerStarsShop } from '@shop/stars';

export function registerShop(runtime: Runtime): void {
    registerMenuShop(runtime);
    registerStarsShop(runtime);
    registerPlategaShop(runtime);
    registerPollingShop(runtime);
}
