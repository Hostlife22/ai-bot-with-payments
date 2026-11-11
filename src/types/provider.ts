export interface ImageAttachment {
    image_url?: {
        url: string;
    };
    url?: string;
}
export interface ImageMessage {
    images?: ImageAttachment[];
    content?: string;
}
