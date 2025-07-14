// IndexedDB helper using idb

import { openDB } from 'idb';

// Use a single object store for all messages, indexed by deviceId
export async function getDB() {
  return openDB('chatlan-messages', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('deviceId', 'deviceId', { unique: false });
      } else {
        // If upgrading from v1, add index if missing
        const store = db.transaction.objectStore('messages');
        if (!store.indexNames.contains('deviceId')) {
          store.createIndex('deviceId', 'deviceId', { unique: false });
        }
      }
    },
  });
}



// Save message to the single 'messages' store, always include deviceId
export async function saveMessage(deviceId, message) {
  if (!message.id) {
    message.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }
  message.deviceId = deviceId;
  const db = await getDB();
  try {
    await db.put('messages', message);
    // Debug log
    // console.log('Saved message to store', deviceId, message);
  } catch (e) {
    console.error('Failed to save message to IndexedDB', e, message);
  }
}



// Get all messages for a deviceId from the single store
export async function getAllMessages(deviceId) {
  const db = await getDB();
  try {
    // Use the index to get all messages for this deviceId
    return await db.getAllFromIndex('messages', 'deviceId', deviceId);
  } catch (e) {
    console.error('Failed to get messages from IndexedDB', e);
    return [];
  }
}
