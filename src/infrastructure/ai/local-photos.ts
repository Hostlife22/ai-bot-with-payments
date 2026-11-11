import { randomInt } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { PhotoSource } from '@contracts/ai';

export function createLocalPhotoSource(directory: string): PhotoSource {
    return {
        async random() {
            try {
                const files = (await readdir(directory, { withFileTypes: true })).filter(
                    (file) => file.isFile() && /\.(?:jpe?g|png|webp)$/i.test(file.name),
                );
                if (!files.length) {
                    return null;
                }
                const file = files[randomInt(files.length)];
                return file ? { source: join(directory, file.name) } : null;
            } catch (error) {
                if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                    return null;
                }
                throw error;
            }
        },
    };
}
