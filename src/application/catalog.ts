import { CATALOG, LEGACY_RUBLE_PRICES } from '@constants/catalog';
import { PERCENT } from '@constants/numbers';
import { packageDefaults } from '@constants/packages';
import { errorMessages } from '@messages/errors';
import { fieldNames } from '@messages/fields';
import type { PackageData } from '@contracts/billing';
import type { PackageName } from '@contracts/catalog';
import type { Repository } from '@contracts/repositories';
import type { Catalog } from '@contracts/services';
import { nonNegativeInteger, required } from '@domain/validation';

export function isPackageName(value: string): value is PackageName {
    return Object.hasOwn(packageDefaults, value);
}

export function parsePackage(value: string): PackageData {
    const parts = value.split('_');
    if (parts.length !== CATALOG.fields) {
        throw new Error(errorMessages.invalidPackageShape);
    }
    const [stars, rub, text, img] = parts.map((part) =>
        nonNegativeInteger(part, fieldNames.packageValue),
    );
    const result = {
        stars: required(stars),
        rub: required(rub),
        text: required(text),
        img: required(img),
    };
    if (result.stars < 1 || result.rub < 1 || result.text + result.img < 1) {
        throw new Error(errorMessages.invalidPackageContents);
    }
    return result;
}

export function discountedPrice(price: number, discount: number): number {
    if (!Number.isFinite(discount) || discount < 0 || discount > PERCENT) {
        throw new Error(errorMessages.invalidDiscount);
    }
    return Math.max(CATALOG.minimumPrice, Math.round(price * (1 - discount / PERCENT)));
}

export function createCatalog(repository: Pick<Repository, 'getSetting' | 'setSetting'>): Catalog {
    async function getSafePkg(key: string, defaultValue: string): Promise<string[]> {
        let value = await repository.getSetting(key, defaultValue);
        const parts = value.split('_');
        if (parts.length === CATALOG.legacyFields) {
            const stars = required(parts[0]);
            const rub = LEGACY_RUBLE_PRICES[stars] ?? CATALOG.legacyFallbackRub;
            value = `${stars}_${rub}_${parts[1]}_${parts[2]}`;
            parsePackage(value);
            await repository.setSetting(key, value);
        }
        parsePackage(value);
        return value.split('_');
    }

    async function getPackageData(name: string): Promise<PackageData> {
        if (!isPackageName(name)) {
            throw new Error(errorMessages.unknownPackage);
        }
        return parsePackage((await getSafePkg(`pkg_${name}`, packageDefaults[name])).join('_'));
    }

    return { getSafePkg, getPackageData };
}
