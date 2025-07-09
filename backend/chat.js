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
  const logs = [];

  function addLog(message) {
    logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    if (logs.length > 100) logs.shift(); // Keep only last 100 logs
  }

  function getLastFourDigits(peerId) {
    return peerId.slice(-4);
  }

  // Send logs to clients
  function sendLogs() {
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'logs',
          logs: logs
        }));
      }
    });
  }

  // Send updated peer list to all clients
  function updatePeerList() {
    const peerList = Array.from(connectedPeers.entries()).map(([peerId, peer]) => ({
      id: peerId,
      name: peer.name
    }));
    
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'connectedPeers',
          peers: peerList
        }));
      }
    });
  }

  libp2p.handle(protocol, async ({ stream, connection }) => {
    const peerId = connection.remotePeer.toString();
    const outgoingStream = pushable();
    outgoingStreams.set(peerId, outgoingStream);
    
    const introMessage = JSON.stringify({ type: 'intro', name });
    outgoingStream.push(fromString(introMessage));

    pipe(outgoingStream, stream.sink).catch(err => {
      addLog(`Outgoing stream error for ${peerId}: ${err.message}`);
      cleanupPeer(peerId);
    });

    pipe(stream.source, async function (source) {
      for await (const data of source) {
        const messageStr = toString(data.subarray());
        try {
          const message = JSON.parse(messageStr);
          if (message.type === 'intro') {
            connectedPeers.set(peerId, { name: message.name, stream: outgoingStream });
            addLog(`${message.name} connected`);
            updatePeerList();
          } else if (message.type === 'chat') {
            const peer = connectedPeers.get(peerId);
            const senderName = peer ? peer.name : 'Unknown';
            
            // Send message to all connected clients
            wss.clients.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'message',
                  from: senderName,
                  fromId: peerId,
                  content: message.content,
                  timestamp: new Date().toISOString()
                }));
              }
            });
          }
        } catch (err) {
          addLog(`Error parsing message from ${peerId}: ${err.message}`);
        }
      }
    }).catch(err => {
      addLog(`Incoming stream error for ${peerId}: ${err.message}`);
      cleanupPeer(peerId);
    });
  });

  libp2p.addEventListener('peer:discovery', async (evt) => {
    const peerId = evt.detail.id.toString();
    if (connectedPeers.has(peerId) || pendingConnections.has(peerId)) return;

    pendingConnections.add(peerId);
    addLog(`Discovered peer: ${getLastFourDigits(peerId)}`);

    try {
      const stream = await libp2p.dialProtocol(evt.detail.id, protocol);
      const outgoingStream = pushable();
      outgoingStreams.set(peerId, outgoingStream);
      
      const introMessage = JSON.stringify({ type: 'intro', name });
      outgoingStream.push(fromString(introMessage));

      pipe(outgoingStream, stream.sink).catch(err => {
        addLog(`Outgoing stream error for ${peerId}: ${err.message}`);
        cleanupPeer(peerId);
      });

      pipe(stream.source, async function (source) {
        for await (const data of source) {
          const messageStr = toString(data.subarray());
          try {
            const message = JSON.parse(messageStr);
            if (message.type === 'intro') {
              connectedPeers.set(peerId, { name: message.name, stream: outgoingStream });
              addLog(`Connected to ${message.name}`);
              updatePeerList();
            } else if (message.type === 'chat') {
              const peer = connectedPeers.get(peerId);
              const senderName = peer ? peer.name : 'Unknown';
              
              // Send message to all connected clients
              wss.clients.forEach(client => {
                if (client.readyState === 1) {
                  client.send(JSON.stringify({
                    type: 'message',
                    from: senderName,
                    fromId: peerId,
                    content: message.content,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            }
          } catch (err) {
            addLog(`Error parsing message from ${peerId}: ${err.message}`);
          }
        }
      }).catch(err => {
        addLog(`Incoming stream error for ${peerId}: ${err.message}`);
        cleanupPeer(peerId);
      });

    } catch (err) {
      addLog(`Failed to connect to peer ${getLastFourDigits(peerId)}: ${err.message}`);
    }
    
    pendingConnections.delete(peerId);
  });

  function cleanupPeer(peerId) {
    const peer = connectedPeers.get(peerId);
    if (peer) {
      addLog(`${peer.name} disconnected`);
    }
    
    connectedPeers.delete(peerId);
    discoveredPeers.delete(peerId);
    pendingConnections.delete(peerId);
    
    const stream = outgoingStreams.get(peerId);
    if (stream) {
      stream.end();
      outgoingStreams.delete(peerId);
    }
    
    updatePeerList();
  }

  libp2p.addEventListener('peer:disconnect', (evt) => {
    const peerId = evt.detail.toString();
    cleanupPeer(peerId);
  });

  async function sendMessage(message, targetPeerId) {
    const stream = outgoingStreams.get(targetPeerId);
    if (!stream) {
      addLog(`No stream found for peer ${targetPeerId}`);
      return false;
    }

    try {
      const chatMessage = JSON.stringify({ type: 'chat', content: message });
      stream.push(fromString(chatMessage));
      addLog(`Message sent to ${connectedPeers.get(targetPeerId)?.name || 'Unknown'}`);
      return true;
    } catch (err) {
      addLog(`Failed to send message to ${targetPeerId}: ${err.message}`);
      cleanupPeer(targetPeerId);
      return false;
    }
  }

  await libp2p.start();
  addLog(`libp2p node started as "${name}"`);
  
  libp2p.getMultiaddrs().forEach(addr => {
    addLog(`Listening on: ${addr.toString()}`);
  });

  return { 
    libp2p, 
    discoveredPeers, 
    connectedPeers, 
    outgoingStreams, 
    pendingConnections, 
    sendMessage, 
    cleanupPeer,
    getLogs: () => logs
  };
}

// Replace hardcoded 5000 with dynamic port
const port = process.env.PORT || 5000; // default to 5000 if not set
const wss = new WebSocketServer({ port });

let node = null;

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start' && !node) {
        node = await createNode(data.name, wss);
        
        // Send initial state to client
        const peerList = Array.from(node.connectedPeers.entries()).map(([peerId, peer]) => ({
          id: peerId,
          name: peer.name
        }));
        
        ws.send(JSON.stringify({
          type: 'nodeStarted',
          name: data.name,
          peers: peerList
        }));
        
      } else if (data.type === 'sendMessage' && node) {
        const success = await node.sendMessage(data.message, data.targetPeerId);
        
        if (success) {
          // Echo the message back to sender
          ws.send(JSON.stringify({
            type: 'message',
            from: data.senderName,
            fromId: 'self',
            content: data.message,
            timestamp: new Date().toISOString(),
            toId: data.targetPeerId
          }));
        }
        
      } else if (data.type === 'getLogs' && node) {
        ws.send(JSON.stringify({
          type: 'logs',
          logs: node.getLogs()
        }));
        
      } else if (data.type === 'quit' && node) {
        for (const stream of node.outgoingStreams.values()) {
          stream.end();
        }
        await node.libp2p.stop();
        node = null;
        
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'shutdown'
            }));
          }
        });
        
        setTimeout(() => {
          wss.close();
          process.exit(0);
        }, 1000);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log('WebSocket server started on port 5000');