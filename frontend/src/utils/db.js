
// IndexedDB helper using idb

import { openDB } from 'idb';

// Database schema for improved message flow
export async function getDB() {
  return openDB('chatlan-messages', 4, {
    upgrade(db) {
      // Messages store - all direct messages
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('fromId', 'fromId', { unique: false });
        store.createIndex('toId', 'toId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('conversation', 'conversation', { unique: false }); // for peer-to-peer chat grouping
      }
      
      // Peers store - known peers by deviceId
      if (!db.objectStoreNames.contains('peers')) {
        const peerStore = db.createObjectStore('peers', { keyPath: 'deviceId' });
        peerStore.createIndex('name', 'name', { unique: false });
        peerStore.createIndex('lastSeen', 'lastSeen', { unique: false });
      }
      
      // Group messages store
      if (!db.objectStoreNames.contains('groupMessages')) {
        const groupStore = db.createObjectStore('groupMessages', { keyPath: 'id' });
        groupStore.createIndex('groupId', 'groupId', { unique: false });
        groupStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // User settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
}

// Save message with improved structure
export async function saveMessage(message) {
  if (!message.id) {
    message.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }
  
  // Create conversation key for grouping messages between two peers
  const conversationKey = [message.fromId, message.toId].sort().join('_');
  message.conversation = conversationKey;
  message.savedAt = new Date().toISOString();
  
  const db = await getDB();
  try {
    await db.put('messages', message);
    console.log('✅ Message saved:', message.type || 'text', 'from:', message.fromId, 'to:', message.toId);
  } catch (e) {
    console.error('❌ Failed to save message:', e);
  }
}

// Get all messages for a conversation (between self and peer)
export async function getMessagesForPeer(selfDeviceId, peerDeviceId) {
  const db = await getDB();
  try {
    const conversationKey = [selfDeviceId, peerDeviceId].sort().join('_');
    const messages = await db.getAllFromIndex('messages', 'conversation', conversationKey);
    // Sort by timestamp to ensure proper order
    return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (e) {
    console.error('Failed to get messages for peer:', e);
    return [];
  }
}

// Get all messages (for migration/debugging)
export async function getAllMessages() {
  const db = await getDB();
  try {
    const messages = await db.getAll('messages');
    return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (e) {
    console.error('Failed to get all messages:', e);
    return [];
  }
}

// Save peer to the 'peers' store with enhanced info
export async function savePeerToDb(peer) {
  const db = await getDB();
  try {
    const peerData = {
      deviceId: peer.deviceId,
      name: peer.name,
      lastSeen: new Date().toISOString(),
      isOnline: peer.isOnline || false,
      ...peer
    };
    await db.put('peers', peerData);
    console.log('✅ Peer saved:', peerData.name, '(' + peerData.deviceId + ')');
  } catch (e) {
    console.error('❌ Failed to save peer:', e);
  }
}

// Get all peers from the 'peers' store
export async function getAllPeersFromDb() {
  const db = await getDB();
  try {
    return await db.getAll('peers');
  } catch (e) {
    console.error('Failed to get peers from IndexedDB', e);
    return [];
  }
}

// Save group message to the 'groupMessages' store
export async function saveGroupMessage(groupId, message) {
  if (!message.id) {
    message.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  }
  message.groupId = groupId;
  message.savedAt = new Date().toISOString();
  const db = await getDB();
  try {
    await db.put('groupMessages', message);
    console.log('✅ Group message saved to IndexedDB:', message.from || 'Unknown', '→', message.content?.substring(0, 50) + '...');
  } catch (e) {
    console.error('❌ Failed to save group message to IndexedDB', e, message);
  }
}

// Get all group messages for a groupId
export async function getAllGroupMessages(groupId) {
  const db = await getDB();
  try {
    const messages = await db.getAllFromIndex('groupMessages', 'groupId', groupId);
    // Sort by timestamp to ensure proper order
    return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  } catch (e) {
    console.error('Failed to get group messages from IndexedDB', e);
    return [];
  }
}

// User settings management
export async function saveSetting(key, value) {
  const db = await getDB();
  try {
    await db.put('settings', { key, value, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Failed to save setting:', e);
  }
}

export async function getSetting(key) {
  const db = await getDB();
  try {
    const setting = await db.get('settings', key);
    return setting?.value || null;
  } catch (e) {
    console.error('Failed to get setting:', e);
    return null;
  }
}

// Get message statistics
export async function getMessageStats() {
  const db = await getDB();
  try {
    const messages = await db.getAll('messages');
    const groupMessages = await db.getAll('groupMessages');
    const peers = await db.getAll('peers');
    
    return {
      totalMessages: messages.length,
      totalGroupMessages: groupMessages.length,
      totalPeers: peers.length,
      lastMessageTime: messages.length > 0 ? 
        Math.max(...messages.map(m => new Date(m.timestamp).getTime())) : null
    };
  } catch (e) {
    console.error('Failed to get message statistics', e);
    return { totalMessages: 0, totalGroupMessages: 0, totalPeers: 0, lastMessageTime: null };
  }
}

// Clear all stored data (for debugging/reset)
export async function clearAllData() {
  const db = await getDB();
  try {
    await db.clear('messages');
    await db.clear('groupMessages');
    await db.clear('peers');
    console.log('✅ All data cleared from IndexedDB');
  } catch (e) {
    console.error('❌ Failed to clear data from IndexedDB', e);
  }
}
