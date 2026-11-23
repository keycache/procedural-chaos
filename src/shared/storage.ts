import { openDB, type DBSchema } from 'idb';

export type StoredItem = {
  id: string;
  name: string;
  schemaVersion: number;
  data: unknown;
  createdAt: string;
  updatedAt: string;
};

interface ChaosDatabase extends DBSchema {
  mandalas: { key: string; value: StoredItem };
  artworks: { key: string; value: StoredItem };
  videoProjects: { key: string; value: StoredItem };
  settings: { key: string; value: unknown };
}

export function openDatabase() {
  return openDB<ChaosDatabase>('procedural-chaos', 1, {
    upgrade(database) {
      database.createObjectStore('mandalas', { keyPath: 'id' });
      database.createObjectStore('artworks', { keyPath: 'id' });
      database.createObjectStore('videoProjects', { keyPath: 'id' });
      database.createObjectStore('settings');
    },
    blocked() {
      console.error(
        'Local storage upgrade is blocked. Close other Procedural Chaos tabs and reload.',
      );
    },
  });
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  try {
    await database.put('settings', value, key);
  } finally {
    database.close();
  }
}

export async function readSetting(key: string): Promise<unknown> {
  const database = await openDatabase();
  try {
    return await database.get('settings', key);
  } finally {
    database.close();
  }
}
