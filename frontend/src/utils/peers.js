// Utility for managing peer name/deviceId mapping in localStorage

const PEERS_KEY = 'peersMap';

export function savePeer(deviceId, name) {
  let peers = {};
  try {
    peers = JSON.parse(localStorage.getItem(PEERS_KEY)) || {};
  } catch {}
  peers[deviceId] = name;
  localStorage.setItem(PEERS_KEY, JSON.stringify(peers));
}

export function getPeerName(deviceId) {
  try {
    const peers = JSON.parse(localStorage.getItem(PEERS_KEY)) || {};
    return peers[deviceId] || deviceId;
  } catch {
    return deviceId;
  }
}

export function getAllPeers() {
  try {
    return JSON.parse(localStorage.getItem(PEERS_KEY)) || {};
  } catch {
    return {};
  }
}
