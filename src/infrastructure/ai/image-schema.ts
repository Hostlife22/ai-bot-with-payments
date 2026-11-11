import type { ImageAttachment, ImageMessage } from '@contracts/provider';

export function parseImageMessage(value: unknown): ImageMessage {
    if (typeof value !== 'object' || value === null) {
        return {};
    }
    const data = value as Record<string, unknown>;
    const result: ImageMessage = {};
    if (typeof data.content === 'string') {
        result.content = data.content;
    }
    if (Array.isArray(data.images)) {
        result.images = data.images.flatMap<ImageAttachment>((image: unknown) => {
            if (typeof image !== 'object' || image === null) {
                return [];
            }
            const item = image as Record<string, unknown>;
            if (typeof item.url === 'string') {
                return [{ url: item.url }];
            }
            if (
                typeof item.image_url === 'object' &&
                item.image_url !== null &&
                'url' in item.image_url &&
                typeof item.image_url.url === 'string'
            ) {
                return [{ image_url: { url: item.image_url.url } }];
            }
            return [];
        });
    }
    return result;
}
