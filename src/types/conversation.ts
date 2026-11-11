import type { Readable } from 'node:stream';

export interface HistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface AiResponse {
    text: string;
    photo: Photo | null;
    showBuyButton?: boolean;
    chargeText?: boolean;
}
export type Photo =
    | string
    | {
          source: string;
          filename?: string;
      }
    | {
          source: Buffer;
          filename?: string;
      }
    | {
          source: Readable;
          filename?: string;
      };
