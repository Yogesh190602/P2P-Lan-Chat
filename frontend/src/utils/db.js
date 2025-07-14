// IndexedDB helper using idb
import { openDB } from 'idb';

export async function getDB(deviceId) {
  return openDB('chatlan-messages', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(deviceId)) {
        db.createObjectStore(deviceId, { keyPath: 'id' });
      }
    },
  });
}

export async function saveMessage(deviceId, message) {
  const db = await getDB(deviceId);
  await db.put(deviceId, message);
}

export async function getAllMessages(deviceId) {
  const db = await getDB(deviceId);
  return db.getAll(deviceId);
}
