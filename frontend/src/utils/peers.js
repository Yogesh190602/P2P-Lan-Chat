import { savePeerToDb, getAllPeersFromDb } from "./db";

// Save peer with enhanced information
export async function savePeer(deviceId, name, isOnline = false) {
  await savePeerToDb({ deviceId, name, isOnline });
}

// Get peer name by device ID
export async function getPeerName(deviceId) {
  const peers = await getAllPeersFromDb();
  const peer = peers.find(p => p.deviceId === deviceId);
  return peer ? peer.name : deviceId;
}

// Get all peers as an array (for the new flow)
export async function getAllPeers() {
  const peersArray = await getAllPeersFromDb();
  return peersArray.filter(peer => peer && peer.deviceId && peer.name);
}

// Get peers as a map (for backward compatibility)
export async function getPeersMap() {
  const peersArray = await getAllPeersFromDb();
  const peersMap = {};
  peersArray.forEach(peer => {
    if (peer && peer.deviceId && peer.name) {
      peersMap[peer.deviceId] = peer.name;
    } else {
      console.warn("Skipping malformed peer entry:", peer);
    }
  });
  return peersMap;
}

// Update peer online status
export async function updatePeerOnlineStatus(deviceId, isOnline) {
  const peers = await getAllPeersFromDb();
  const peer = peers.find(p => p.deviceId === deviceId);
  if (peer) {
    await savePeerToDb({ ...peer, isOnline, lastSeen: new Date().toISOString() });
  }
}
