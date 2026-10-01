#!/usr/bin/env -S bun
import type { Contract as End } from '../../snapshots/3325f753be5731500637a021f9e292e4f75b6b9e796e18d883b129705a926217/contract';
import endContract from '../../snapshots/3325f753be5731500637a021f9e292e4f75b6b9e796e18d883b129705a926217/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/501f71d97f4f409d029e298daa515dabc3c4bae619e41930c8b1f13dac4c476d/contract';
import startContract from '../../snapshots/501f71d97f4f409d029e298daa515dabc3c4bae619e41930c8b1f13dac4c476d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('sessionVersion', 'text', {
          notNull: true,
          default: lit('initial'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
