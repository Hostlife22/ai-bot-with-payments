import { USER_REWARDS } from '@constants/users';

export const referralMessages = {
    registered: `🎉 По вашей ссылке зарегистрировался новый пользователь! Вам начислено +${USER_REWARDS.referrerTexts} сообщений.`,
} as const;
