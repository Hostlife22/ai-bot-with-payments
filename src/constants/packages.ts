import type { PackageData } from '@contracts/billing';

export const DEFAULT_PACKAGES = {
    t50: { stars: 35, rub: 50, text: 50, img: 0 },
    t200: { stars: 125, rub: 150, text: 200, img: 0 },
    t500: { stars: 250, rub: 300, text: 500, img: 0 },
    i5: { stars: 35, rub: 50, text: 0, img: 5 },
    i15: { stars: 125, rub: 150, text: 0, img: 15 },
    i50: { stars: 300, rub: 390, text: 0, img: 50 },
    lite: { stars: 65, rub: 80, text: 50, img: 5 },
    medium: { stars: 150, rub: 200, text: 200, img: 20 },
    hard: { stars: 350, rub: 500, text: 500, img: 50 },
    full: { stars: 750, rub: 999, text: 1_000, img: 100 },
} as const satisfies Record<string, Readonly<PackageData>>;

// Preserve the persisted Stars_RUB_texts_images format used by global_settings.
export const packageDefaults = Object.fromEntries(
    Object.entries(DEFAULT_PACKAGES).map(([name, pack]) => [
        name,
        `${pack.stars}_${pack.rub}_${pack.text}_${pack.img}`,
    ]),
) as { readonly [Name in keyof typeof DEFAULT_PACKAGES]: string };
