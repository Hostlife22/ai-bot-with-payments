import type { Payment } from '@contracts/billing';
import type { HistoryMessage } from '@contracts/conversation';
import type { Promo, PromoResult } from '@contracts/promotions';
import type { RoleMode, User, UserId } from '@contracts/user';

import type { AdminStats } from './statistics.js';

export interface UserRepository {
    registerReferral: (userId: UserId, referrerId: UserId | null) => Promise<boolean>;
    requireUser: (userId: UserId) => Promise<User>;
    getUser: (userId: UserId) => Promise<User | undefined>;
    createUser: (userId: UserId, referrerId?: UserId | null) => Promise<void>;
    getReferralsCount: (userId: UserId) => Promise<number>;
    acceptTerms: (userId: UserId) => Promise<void>;
    setBlockStatus: (userId: UserId, isBlocked: boolean) => Promise<void>;
    updateUserMeta: (
        userId: UserId,
        firstName: string,
        username: string | undefined,
    ) => Promise<void>;
    updateLastActive: (userId: UserId) => Promise<void>;
}
export interface ConversationRepository {
    setUserPrompt: (userId: UserId, prompt: string, mode?: RoleMode) => Promise<void>;
    saveMessage: (
        userId: UserId,
        role: HistoryMessage['role'],
        content: string,
        cost?: number,
    ) => Promise<void>;
    getHistory: (userId: UserId, limit?: number) => Promise<HistoryMessage[]>;
    clearHistory: (userId: UserId) => Promise<void>;
    addApiCost: (userId: UserId, cost: number) => Promise<void>;
}
export interface BalanceRepository {
    reserveBalance: (userId: UserId, resource: 'text' | 'image') => Promise<boolean>;
    refundBalance: (userId: UserId, resource: 'text' | 'image') => Promise<void>;
    resetAllFreeRequests: (textCount?: number, imageCount?: number) => Promise<void>;
    addFreeRequests: (userId: UserId, count: number) => Promise<void>;
    grantPackage: (
        userId: UserId,
        textCount: number,
        imageCount: number,
        amount: number,
        currency: string,
    ) => Promise<void>;
    adminSetTextBalance: (userId: UserId, count: number) => Promise<void>;
    adminSetImageBalance: (userId: UserId, count: number) => Promise<void>;
    claimDailyBonus: (userId: UserId) => Promise<boolean>;
}
export interface SettingsRepository {
    isFreeModeEnabled: () => Promise<boolean>;
    toggleFreeMode: (isEnabled: boolean) => Promise<void>;
    getSetting: (
        key: string,
        defaultValue: string | number | boolean,
        applyEscape?: boolean,
    ) => Promise<string>;
    setSetting: (key: string, value: string | number | boolean) => Promise<void>;
}
export interface PromotionRepository {
    createPromocode: (
        code: string,
        uses_left: number,
        text_reward: number,
        img_reward: number,
        discount_amount: number,
        max_uses_per_user?: number,
        is_new_users_only?: boolean,
    ) => Promise<void>;
    updatePromoField: (
        id: number,
        field: string,
        value: string | number | boolean,
    ) => Promise<void>;
    activatePromocode: (userId: UserId, code: string) => Promise<PromoResult>;
    getAllPromocodes: () => Promise<Promo[]>;
    getPromocodeById: (id: number) => Promise<Promo | undefined>;
    togglePromoStatus: (id: number) => Promise<void>;
    togglePromoNewUsersOnly: (id: number) => Promise<void>;
    deletePromocode: (id: number) => Promise<void>;
}
export interface CampaignRepository {
    setStoreOpened: (userId: UserId) => Promise<void>;
    getUsersForRetargeting24h: () => Promise<string[]>;
    mark24hPromoSent: (userId: UserId) => Promise<void>;
    getUsersForRetargetingStore: () => Promise<string[]>;
    markStorePromoSent: (userId: UserId) => Promise<void>;
    getUsersForBonusNotify: () => Promise<string[]>;
    markBonusNotified: (userId: UserId) => Promise<void>;
}
export interface AdminRepository {
    getAdminStats: () => Promise<AdminStats>;
    getAllUserIds: () => Promise<string[]>;
    getUsersTotal: () => Promise<number>;
    getUsersPage: (
        limit: number,
        offset: number,
    ) => Promise<Pick<User, 'telegram_id' | 'first_name' | 'username' | 'is_blocked'>[]>;
    getPaymentHistory: (userId: UserId) => Promise<Payment[]>;
    logPaymentFailure: (errorText: string) => Promise<void>;
}
export interface Repository
    extends
        UserRepository,
        ConversationRepository,
        BalanceRepository,
        SettingsRepository,
        PromotionRepository,
        CampaignRepository,
        AdminRepository {}
