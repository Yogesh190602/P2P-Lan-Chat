#!/usr/bin/env node

import { WebSocket } from 'ws';

console.log('Testing WebSocket connection to chat server...');

const ws = new WebSocket('ws://localhost:5000');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
  
  // Start the node
  console.log('📤 Sending start message...');
  ws.send(JSON.stringify({ type: 'start', name: 'TestUser' }));
});

ws.on('message', function message(data) {
  console.log('📥 Received:', data.toString());
  
  try {
    const parsed = JSON.parse(data.toString());
    if (parsed.type === 'nodeStarted') {
      console.log('✅ Node started successfully');
      console.log('📊 Connected peers:', parsed.peers?.length || 0);
      console.log('📊 Groups:', parsed.groups?.length || 0);
    } else if (parsed.type === 'connectedPeers') {
      console.log('👥 Peer list updated:', parsed.peers?.length || 0);
    } else if (parsed.type === 'message') {
      console.log('💬 Message received:', parsed.content);
    }
  } catch (err) {
    console.error('❌ Error parsing message:', err.message);
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔌 Connection closed');
});

// Keep the script running for 10 seconds
setTimeout(() => {
  console.log('⏰ Test completed');
  ws.close();
  process.exit(0);
}, 10000);
