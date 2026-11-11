import type { UserId } from '@contracts/user';

export interface AiJob {
    userId: UserId;
    text: string;
    chatId: number;
    shouldDecrement: boolean;
    tempMsgId?: number;
}
export type BroadcastMessage =
    | {
          type: 'text';
          text: string;
          btn: string;
      }
    | {
          type: 'photo' | 'video' | 'document' | 'animation';
          file_id: string;
          caption: string;
          btn: string;
      };
export interface BroadcastJob {
    userId: UserId;
    msgData?: BroadcastMessage;
    messageText?: string;
}
