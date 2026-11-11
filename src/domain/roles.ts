import type { RoleMode } from '@contracts/user';

export const roleModes = [
    'default',
    'psych',
    'coder',
    'eng',
    'flirthot',
    'flirt',
    'romance',
    'bold',
    'dom',
    'hardcore',
    'truth_dare',
    'custom',
] as const;
export function isRoleMode(value: string): value is RoleMode {
    return roleModes.some((mode) => mode === value);
}
