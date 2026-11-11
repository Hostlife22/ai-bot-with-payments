import type { BroadcastMessage } from '@contracts/jobs';
import type { PromoDraft } from '@contracts/promotions';

export type InputState =
    | 'WAITING_FOR_CUSTOM_PROMPT'
    | 'WAITING_FOR_PROMOCODE'
    | 'WAITING_MU_ID'
    | 'WAITING_MU_TEXT'
    | 'WAITING_MU_IMG'
    | 'WAITING_MU_MSG'
    | 'WAITING_FOR_BROADCAST'
    | 'WAITING_FOR_BROADCAST_BTN'
    | 'CONFIRM_BROADCAST'
    | 'WAITING_NEW_PROMO_CODE'
    | `WAITING_EDIT_${string}`
    | `WAITING_PDRAFT_${string}`
    | `WAITING_PEDIT_${string}`;
export type UserStates = Partial<Record<string, InputState>>;
export interface Sessions {
    userState: UserStates;
    touchedAt: Partial<Record<string, number>>;
    adminPromoDraft: Partial<Record<string, PromoDraft>>;
    adminBroadcastMsg: Partial<Record<string, BroadcastMessage>>;
    lastMessageTime: Partial<Record<string, number>>;
    adminTargetUser: Partial<Record<string, number>>;
}
