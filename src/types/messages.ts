import type { RoleMode } from './user.js';

export type PromptTemplates = Readonly<Record<`prompt_${Exclude<RoleMode, 'custom'>}`, string>>;
export type ImageStyles = Readonly<Record<RoleMode, string>>;
