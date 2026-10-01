#!/usr/bin/env -S bun
import type { Contract as End } from '../../snapshots/501f71d97f4f409d029e298daa515dabc3c4bae619e41930c8b1f13dac4c476d/contract';
import endContract from '../../snapshots/501f71d97f4f409d029e298daa515dabc3c4bae619e41930c8b1f13dac4c476d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b93afbac1e30bc6fc36d99801b5a79a215bf5dbdfe02ead4f6d9dc75f23bae32/contract';
import startContract from '../../snapshots/b93afbac1e30bc6fc36d99801b5a79a215bf5dbdfe02ead4f6d9dc75f23bae32/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'passwordResetToken',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('usedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'passwordResetToken',
        constraint: 'passwordResetToken_userId_key',
        columns: ['userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'passwordResetToken',
        constraint: 'passwordResetToken_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'passwordResetToken',
        index: 'passwordResetToken_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'passwordResetToken',
        foreignKey: {
          name: 'passwordResetToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
