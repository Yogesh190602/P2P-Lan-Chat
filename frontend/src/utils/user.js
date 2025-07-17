import { saveSetting, getSetting } from './db';

// User identity management
export async function initializeUser() {
  // Check localStorage first for backward compatibility
  let name = localStorage.getItem('userName');
  let deviceId = localStorage.getItem('deviceId');
  
  // If not in localStorage, check IndexedDB
  if (!name) {
    name = await getSetting('userName');
  }
  if (!deviceId) {
    deviceId = await getSetting('deviceId');
  }
  
  // Generate device ID if not exists
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    await saveUserDeviceId(deviceId);
  }
  
  console.log('🔐 User initialized:', { name: name || 'Not set', deviceId });
  
  return {
    name,
    deviceId,
    isComplete: !!(name && deviceId)
  };
}

// Save user name
export async function saveUserName(name) {
  localStorage.setItem('userName', name);
  await saveSetting('userName', name);
  console.log('✅ User name saved:', name);
}

// Save user device ID
export async function saveUserDeviceId(deviceId) {
  localStorage.setItem('deviceId', deviceId);
  await saveSetting('deviceId', deviceId);
  console.log('✅ Device ID saved:', deviceId);
}

// Get current user info
export async function getCurrentUser() {
  const name = localStorage.getItem('userName') || await getSetting('userName');
  const deviceId = localStorage.getItem('deviceId') || await getSetting('deviceId');
  
  return {
    name,
    deviceId,
    isComplete: !!(name && deviceId)
  };
}

// Clear user data (for logout/reset)
export async function clearUserData() {
  localStorage.removeItem('userName');
  localStorage.removeItem('deviceId');
  await saveSetting('userName', null);
  await saveSetting('deviceId', null);
  console.log('🗑️ User data cleared');
}
