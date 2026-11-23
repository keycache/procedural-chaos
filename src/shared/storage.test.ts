import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase, readSetting, saveSetting } from './storage';

afterEach(async () => {
  await deleteDB('procedural-chaos');
});

describe('browser storage', () => {
  it('initializes the library stores and preserves settings across connections', async () => {
    const database = await openDatabase();
    try {
      for (const store of ['mandalas', 'artworks', 'videoProjects'] as const) {
        expect(await database.count(store)).toBe(0);
      }
    } finally {
      database.close();
    }
    await saveSetting('seed', 'lotus-42');
    expect(await readSetting('seed')).toBe('lotus-42');
    await saveSetting('seed', 'lotus-43');
    expect(await readSetting('seed')).toBe('lotus-43');
  });
});
