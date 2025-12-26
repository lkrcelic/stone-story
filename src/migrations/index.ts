import * as migration_20251205_193809 from './20251205_193809'
import * as migration_20251214_214500 from './20251214_214500_chat_tables'
import * as migration_20251215_000000 from './20251215_000000_fix_userid_type'

export const migrations = [
  {
    up: migration_20251205_193809.up,
    down: migration_20251205_193809.down,
    name: '20251205_193809',
  },
  {
    up: migration_20251214_214500.up,
    down: migration_20251214_214500.down,
    name: '20251214_214500',
  },
  {
    up: migration_20251215_000000.up,
    down: migration_20251215_000000.down,
    name: '20251215_000000_fix_userid_type',
  },
]
