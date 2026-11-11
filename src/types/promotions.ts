export interface Promo {
    id: number;
    code: string;
    uses_left: number;
    text_reward: number;
    img_reward: number;
    discount_amount: number;
    max_uses_total: number;
    max_uses_per_user: number;
    is_active: boolean;
    is_new_users_only: boolean;
    created_at: Date;
}
export type PromoResult =
    Promo | 'NOT_FOUND' | 'INACTIVE' | 'LIMIT_EXCEEDED' | 'ONLY_NEW' | 'ALREADY_USED' | null;
export interface PromoDraft {
    code: string;
    uses: number;
    textReward: number;
    imgReward: number;
    discount: number;
    newOnly: boolean;
}
