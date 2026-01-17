import * as migration_20251205_193809 from './20251205_193809';
import * as migration_20251214_214500_chat_tables from './20251214_214500_chat_tables';
import * as migration_20251215_000000_fix_userid_type from './20251215_000000_fix_userid_type';
import * as migration_20260113_223557 from './20260113_223557';
import * as migration_20260114_060043_add_fts_to_products from './20260114_060043_add_fts_to_products';

export const migrations = [
  {
    up: migration_20251205_193809.up,
    down: migration_20251205_193809.down,
    name: '20251205_193809',
  },
  {
    up: migration_20251214_214500_chat_tables.up,
    down: migration_20251214_214500_chat_tables.down,
    name: '20251214_214500_chat_tables',
  },
  {
    up: migration_20251215_000000_fix_userid_type.up,
    down: migration_20251215_000000_fix_userid_type.down,
    name: '20251215_000000_fix_userid_type',
  },
  {
    up: migration_20260113_223557.up,
    down: migration_20260113_223557.down,
    name: '20260113_223557',
  },
  {
    up: migration_20260114_060043_add_fts_to_products.up,
    down: migration_20260114_060043_add_fts_to_products.down,
    name: '20260114_060043_add_fts_to_products'
  },
];
