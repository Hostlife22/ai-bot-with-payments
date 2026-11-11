import type { roleModes } from '@domain/roles';

export type RoleMode = (typeof roleModes)[number];
export type UserId = number | string;
export interface User {
    telegram_id: string;
    first_name: string | null;
    username: string | null;
    text_balance: number;
    image_balance: number;
    is_blocked: boolean;
    is_premium: boolean;
    premium_until: Date | null;
    has_purchased: boolean;
    current_prompt: string | null;
    roleplay_mode: RoleMode;
    current_discount: number;
    accepted_terms: boolean;
    daily_api_cost: string;
    total_api_cost: string;
}
