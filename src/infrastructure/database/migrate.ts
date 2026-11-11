import { readFile } from 'node:fs/promises';

import type { Pool } from 'pg';

import { DATABASE } from '@constants/database';

import { transaction } from './transaction.js';

export async function migrate(pool: Pool): Promise<void> {
    const baseline = await readFile(new URL('../../../init.sql', import.meta.url), 'utf8');
    const migrations = await Promise.all(
        ['001-legacy-schema.sql', '002-payment-intents.sql'].map(async (name) => ({
            name,
            sql: await readFile(new URL(`../../../migrations/${name}`, import.meta.url), 'utf8'),
        })),
    );
    await transaction(pool, async (client) => {
        await client.query('SELECT pg_advisory_xact_lock($1)', [DATABASE.migrationLockId]);
        await client.query(
            'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        );
        await client.query(baseline);
        for (const migration of migrations) {
            const applied = await client.query(
                'SELECT name FROM schema_migrations WHERE name = $1',
                [migration.name],
            );
            if (applied.rowCount) continue;
            await client.query(migration.sql);
            await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
                migration.name,
            ]);
        }
    });
}
