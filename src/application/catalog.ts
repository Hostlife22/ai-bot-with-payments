import type { PackageData } from '@contracts/billing';
import type { PackageName } from '@contracts/catalog';
import type { Repository } from '@contracts/repositories';
import type { Catalog } from '@contracts/services';
import { packageDefaults } from '@domain/packages';
import { nonNegativeInteger, required } from '@domain/validation';

export function isPackageName(value: string): value is PackageName {
    return Object.hasOwn(packageDefaults, value);
}
export function parsePackage(value: string): PackageData {
    const parts = value.split('_');
    if (parts.length !== 4) throw new Error('Package requires Stars, RUB, texts and images');
    const [stars, rub, text, img] = parts.map((part) => nonNegativeInteger(part, 'Package value'));
    const result = {
        stars: required(stars),
        rub: required(rub),
        text: required(text),
        img: required(img),
    };
    if (result.stars < 1 || result.rub < 1 || result.text + result.img < 1)
        throw new Error('Package requires positive prices and at least one resource');
    return result;
}
export function discountedPrice(price: number, discount: number): number {
    if (!Number.isFinite(discount) || discount < 0 || discount > 100)
        throw new Error('Discount must be between 0 and 100');
    return Math.max(1, Math.round(price * (1 - discount / 100)));
}
export function createCatalog(repository: Pick<Repository, 'getSetting' | 'setSetting'>): Catalog {
    async function getSafePkg(key: string, defaultValue: string): Promise<string[]> {
        let value = await repository.getSetting(key, defaultValue);
        const parts = value.split('_');
        if (parts.length === 3) {
            const stars = required(parts[0]);
            const rub =
                ({ '100': '150', '200': '300', '350': '500' } as Record<string, string>)[stars] ??
                '35';
            value = `${stars}_${rub}_${parts[1]}_${parts[2]}`;
            parsePackage(value);
            await repository.setSetting(key, value);
        }
        parsePackage(value);
        return value.split('_');
    }
    async function getPackageData(name: string): Promise<PackageData> {
        if (!isPackageName(name)) throw new Error('Unknown package');
        return parsePackage((await getSafePkg(`pkg_${name}`, packageDefaults[name])).join('_'));
    }
    return { getSafePkg, getPackageData };
}
