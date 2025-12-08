import * as migration_20251205_193809 from './20251205_193809';

export const migrations = [
  {
    up: migration_20251205_193809.up,
    down: migration_20251205_193809.down,
    name: '20251205_193809'
  },
];
