import type { Pool } from 'pg';

import type { SettingsRepository } from '@contracts/repositories';
import { required } from '@domain/validation';

export function createSettingsRepository(pool: Pool): SettingsRepository {
    async function isFreeModeEnabled() {
        const res = await pool.query<{
            value: string;
        }>("SELECT value FROM global_settings WHERE key = 'free_mode_enabled'");
        return res.rows[0]?.value === 'true';
    }

    async function toggleFreeMode(isEnabled: boolean) {
        await pool.query(
            "INSERT INTO global_settings (key, value) VALUES ('free_mode_enabled', $1) " +
                'ON CONFLICT (key) DO UPDATE SET value = $1',
            [String(isEnabled)],
        );
    }

    async function getSetting(
        key: string,
        defaultValue: string | number | boolean,
        applyEscape = false,
    ) {
        const res = await pool.query<{
            value: string;
        }>('SELECT value FROM global_settings WHERE key = $1', [key]);
        const val = res.rows.length > 0 ? required(res.rows[0]).value : String(defaultValue);
        if (res.rows.length === 0) {
            await pool.query(
                'INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [key, val],
            );
        }
        return applyEscape ? escapeHtml(val) : val;
    }

    async function setSetting(key: string, value: string | number | boolean) {
        await pool.query(
            'INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            [key, String(value)],
        );
    }

    function escapeHtml(unsafe: string) {
        if (typeof unsafe !== 'string') {
            return unsafe;
        }
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return { isFreeModeEnabled, toggleFreeMode, getSetting, setSetting };
}
