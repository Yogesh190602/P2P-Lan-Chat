import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { mdns } from '@libp2p/mdns';
import { pipe } from 'it-pipe';
import { fromString, toString } from 'uint8arrays';
import { pushable } from 'it-pushable';
import { WebSocketServer } from 'ws';

const protocol = '/p2pchat/1.0.0';

async function createNode(name, wss) {
  const libp2p = await createLibp2p({
    addresses: {
      listen: [`/ip4/0.0.0.0/tcp/0`]
    },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [mdns({ interval: 1000 })]
  });

  const discoveredPeers = new Map();
  const connectedPeers = new Map();
  const outgoingStreams = new Map();
  const pendingConnections = new Set();

  function getLastFourDigits(peerId) {
    return peerId.slice(-4);
  }

  libp2p.handle(protocol, async ({ stream, connection }) => {
    const peerId = connection.remotePeer.toString();
    const outgoingStream = pushable();
    outgoingStreams.set(peerId, outgoingStream);
    const introMessage = JSON.stringify({ type: 'intro', name });
    outgoingStream.push(fromString(introMessage));

    pipe(outgoingStream, stream.sink).catch(err => {
      console.error(`Outgoing stream error for ${peerId}:`, err);
      cleanupPeer(peerId);
    });

    pipe(stream.source, async function (source) {
      for await (const data of source) {
        const messageStr = toString(data.subarray());
        try {
          const message = JSON.parse(messageStr);
          if (message.type === 'intro') {
            connectedPeers.set(peerId, { name: message.name, stream: outgoingStream });
            wss.clients.forEach(client => client.send(JSON.stringify({
              type: 'message',
              content: `🔗 ${message.name} connected to you!`
            })));
            wss.clients.forEach(client => client.send(JSON.stringify({
              type: 'connectedPeers',
              peers: Array.from(connectedPeers.values())
            })));
          } else if (message.type === 'chat') {
            const peer = connectedPeers.get(peerId);
            const senderName = peer ? peer.name : 'Unknown';
            wss.clients.forEach(client => client.send(JSON.stringify({
              type: 'message',
              content: `💬 ${senderName}: ${message.content}`
            })));
          }
        } catch (err) {
          const peer = connectedPeers.get(peerId);
          const senderName = peer ? peer.name : 'Unknown';
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: `💬 ${senderName}: ${messageStr}`
          })));
        }
      }
    }).catch(err => {
      console.error(`Incoming stream error for ${peerId}:`, err);
      cleanupPeer(peerId);
    });
  });

  libp2p.addEventListener('peer:discovery', async (evt) => {
    const peerId = evt.detail.id.toString();
    if (connectedPeers.has(peerId) || pendingConnections.has(peerId)) return;

    try {
      const stream = await libp2p.dialProtocol(evt.detail.id, protocol);
      const outgoingStream = pushable();
      outgoingStream.push(fromString(JSON.stringify({ type: 'intro', name })));
      const getPeerName = new Promise((resolve) => {
        pipe(stream.source, async function (source) {
          for await (const data of source) {
            const messageStr = toString(data.subarray());
            try {
              const message = JSON.parse(messageStr);
              if (message.type === 'intro') {
                resolve(message.name);
                break;
              }
            } catch (err) {}
          }
        }).catch(() => resolve(null));
      });
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
      const peerName = await Promise.race([getPeerName, timeoutPromise]);
      stream.close();

      if (peerName) {
        discoveredPeers.set(peerId, { name: peerName, peerIdObj: evt.detail.id });
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: `🔍 Discovered: ${peerName}`
        })));
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'discoveredPeers',
          peers: Array.from(discoveredPeers.values())
        })));
      } else {
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: `🔍 Discovered peer: ${getLastFourDigits(peerId)} (name unknown)`
        })));
      }
    } catch (err) {}
  });

  async function connectToPeer(peerId, peer) {
    if (connectedPeers.has(peerId) || pendingConnections.has(peerId)) {
      wss.clients.forEach(client => client.send(JSON.stringify({
        type: 'message',
        content: `Already connected to ${peer.name}`
      })));
      return;
    }

    pendingConnections.add(peerId);
    try {
      const stream = await libp2p.dialProtocol(peer.peerIdObj, protocol);
      const outgoingStream = pushable();
      outgoingStreams.set(peerId, outgoingStream);
      outgoingStream.push(fromString(JSON.stringify({ type: 'intro', name })));
      pipe(outgoingStream, stream.sink).catch(err => {
        console.error(`Outgoing stream error for ${peerId}:`, err);
        cleanupPeer(peerId);
      });

      pipe(stream.source, async function (source) {
        for await (const data of source) {
          const messageStr = toString(data.subarray());
          try {
            const message = JSON.parse(messageStr);
            if (message.type === 'intro') {
              connectedPeers.set(peerId, { name: message.name, stream: outgoingStream });
              wss.clients.forEach(client => client.send(JSON.stringify({
                type: 'message',
                content: `✅ Connected to ${message.name}`
              })));
              wss.clients.forEach(client => client.send(JSON.stringify({
                type: 'connectedPeers',
                peers: Array.from(connectedPeers.values())
              })));
            } else if (message.type === 'chat') {
              const peer = connectedPeers.get(peerId);
              const senderName = peer ? peer.name : 'Unknown';
              wss.clients.forEach(client => client.send(JSON.stringify({
                type: 'message',
                content: `💬 ${senderName}: ${message.content}`
              })));
            }
          } catch (err) {
            const peer = connectedPeers.get(peerId);
            const senderName = peer ? peer.name : 'Unknown';
            wss.clients.forEach(client => client.send(JSON.stringify({
              type: 'message',
              content: `💬 ${senderName}: ${messageStr}`
            })));
          }
        }
      }).catch(err => {
        console.error(`Incoming stream error for ${peerId}:`, err);
        cleanupPeer(peerId);
      });

      discoveredPeers.delete(peerId);
    } catch (err) {
      wss.clients.forEach(client => client.send(JSON.stringify({
        type: 'message',
        content: `❌ Failed to connect to ${peer.name}: ${err.message}`
      })));
    }
    pendingConnections.delete(peerId);
  }

  function cleanupPeer(peerId) {
    connectedPeers.delete(peerId);
    discoveredPeers.delete(peerId);
    pendingConnections.delete(peerId);
    const stream = outgoingStreams.get(peerId);
    if (stream) {
      stream.end();
      outgoingStreams.delete(peerId);
    }
    wss.clients.forEach(client => client.send(JSON.stringify({
      type: 'connectedPeers',
      peers: Array.from(connectedPeers.values())
    })));
  }

  libp2p.addEventListener('peer:disconnect', (evt) => {
    const peerId = evt.detail.toString();
    const peer = connectedPeers.get(peerId);
    const peerName = peer ? peer.name : 'Unknown';
    wss.clients.forEach(client => client.send(JSON.stringify({
      type: 'message',
      content: `👋 ${peerName} disconnected`
    })));
    cleanupPeer(peerId);
  });

  async function sendMessage(message, targetPeerIds = null) {
    if (outgoingStreams.size === 0) {
      wss.clients.forEach(client => client.send(JSON.stringify({
        type: 'message',
        content: '⚠️ No peers connected. Use /discover to see available peers.'
      })));
      return;
    }

    const chatMessage = JSON.stringify({ type: 'chat', content: message });
    const messageBuffer = fromString(chatMessage);
    const disconnected = [];
    const targets = targetPeerIds || Array.from(outgoingStreams.keys());

    for (const peerId of targets) {
      const stream = outgoingStreams.get(peerId);
      if (stream) {
        try {
          stream.push(messageBuffer);
        } catch (err) {
          console.error(`❌ Failed to send message to ${peerId}:`, err.message);
          disconnected.push(peerId);
        }
      }
    }

    disconnected.forEach(peerId => cleanupPeer(peerId));
  }

  async function handleBroadcast() {
    if (connectedPeers.size === 0) {
      wss.clients.forEach(client => client.send(JSON.stringify({
        type: 'message',
        content: '⚠️ No peers connected for broadcast.'
      })));
      return null;
    }

    wss.clients.forEach(client => client.send(JSON.stringify({
      type: 'message',
      content: '📡 Available peers for broadcast:'
    })));
    const peerList = Array.from(connectedPeers.entries());
    peerList.forEach(([peerId, peer], index) => {
      wss.clients.forEach(client => client.send(JSON.stringify({
        type: 'message',
        content: `  ${index + 1}. ${peer.name}`
      })));
    });
    wss.clients.forEach(client => client.send(JSON.stringify({
      type: 'message',
      content: 'Enter peer numbers separated by commas (e.g., 1,3) or "all" for everyone:'
    })));
    return peerList;
  }

  await libp2p.start();
  wss.clients.forEach(client => client.send(JSON.stringify({
    type: 'message',
    content: `🚀 libp2p node started as "${name}"`
  })));
  libp2p.getMultiaddrs().forEach(addr => {
    wss.clients.forEach(client => client.send(JSON.stringify({
      type: 'message',
      content: `📡 Listening on: ${addr.toString()}`
    })));
  });
  wss.clients.forEach(client => client.send(JSON.stringify({ type: 'nodeStarted' })));

  return { libp2p, discoveredPeers, connectedPeers, outgoingStreams, pendingConnections, sendMessage, handleBroadcast, connectToPeer };
}

const wss = new WebSocketServer({ port: 5000 });
let node = null;

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    if (data.type === 'start' && !node) {
      node = await createNode(data.name, wss);
    } else if (data.type === 'input') {
      const input = data.input.trim();
      if (input === '/quit') {
        if (node) {
          for (const stream of node.outgoingStreams.values()) {
            stream.end();
          }
          await node.libp2p.stop();
          node = null;
        }
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: '👋 Goodbye!'
        })));
        wss.close();
      } else if (input === '/peers') {
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: `👥 Connected peers (${node.connectedPeers.size}):`
        })));
        if (node.connectedPeers.size === 0) {
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: '  No peers connected'
          })));
        } else {
          node.connectedPeers.forEach((peer) => {
            wss.clients.forEach(client => client.send(JSON.stringify({
              type: 'message',
              content: `  📱 ${peer.name}`
            })));
          });
        }
      } else if (input === '/discover') {
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: `🔍 Discovered peers (${node.discoveredPeers.size}):`
        })));
        if (node.discoveredPeers.size === 0) {
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: '  No peers discovered'
          })));
        } else {
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'discoveredPeers',
            peers: Array.from(node.discoveredPeers.values())
          })));
        }
      } else if (input === '/broadcast') {
        const peerList = await node.handleBroadcast();
        if (peerList) {
          ws.peerList = peerList;
        }
      } else if (input === '/help') {
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: `
📋 Commands:
  /peers - Show connected peers
  /discover - Show discovered peers and connect
  /broadcast - Send message to multiple peers
  /quit - Exit the chat
  /help - Show this help message

💡 Tips:
  - Just type a message to send to all connected peers
  - Use /discover to see and connect to available peers
  - Use /broadcast to select specific recipients`
        })));
      } else if (input.length > 0) {
        await node.sendMessage(input);
      }
    } else if (data.type === 'selectPeer') {
      const peerList = Array.from(node.discoveredPeers.entries());
      const selection = data.input.trim().toLowerCase();
      if (selection !== 'skip') {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < peerList.length) {
          const [peerId, peer] = peerList[index];
          await node.connectToPeer(peerId, peer);
        } else {
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: '❌ Invalid selection.'
          })));
        }
      }
    } else if (data.type === 'selectBroadcastPeers' && ws.peerList) {
      const selection = data.input.trim().toLowerCase();
      if (selection === 'all') {
        ws.selectedPeerIds = Array.from(node.connectedPeers.keys());
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: 'Enter your broadcast message:'
        })));
      } else {
        const indices = selection.split(',').map(s => parseInt(s.trim()) - 1);
        const selectedPeerIds = indices
          .filter(i => i >= 0 && i < ws.peerList.length)
          .map(i => ws.peerList[i][0]);
        if (selectedPeerIds.length === 0) {
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: '❌ No valid peers selected.'
          })));
        } else {
          ws.selectedPeerIds = selectedPeerIds;
          const selectedNames = selectedPeerIds.map(peerId => node.connectedPeers.get(peerId).name).join(', ');
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: `📤 Broadcasting to: ${selectedNames}`
          })));
          wss.clients.forEach(client => client.send(JSON.stringify({
            type: 'message',
            content: 'Enter your broadcast message:'
          })));
        }
      }
    } else if (data.type === 'broadcastMessage' && ws.selectedPeerIds) {
      if (data.message.trim()) {
        await node.sendMessage(data.message.trim(), ws.selectedPeerIds);
        wss.clients.forEach(client => client.send(JSON.stringify({
          type: 'message',
          content: '✅ Broadcast message sent!'
        })));
      }
      ws.selectedPeerIds = null;
      ws.peerList = null;
    }
  });
});