
import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { mdns } from '@libp2p/mdns';
import { pipe } from 'it-pipe';
import { fromString, toString } from 'uint8arrays';
import { base64url } from 'multiformats/bases/base64';
import { pushable } from 'it-pushable';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

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

  const connectedPeers = new Map();
  const outgoingStreams = new Map();
  const pendingConnections = new Set();
  const logs = [];
  const groups = new Map();
  const myPeerId = libp2p.peerId.toString();

  function addLog(message) {
    logs.push({ timestamp: new Date().toISOString(), message });
    if (logs.length > 100) logs.shift();
  }

  function getLastFourDigits(peerId) {
    return peerId.slice(-4);
  }


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

  function updateGroupList() {
    const groupList = Array.from(groups.entries()).map(([groupId, group]) => ({
      id: groupId,
      name: group.name,
      members: group.members,
      createdBy: group.createdBy,
      createdAt: group.createdAt
    }));

    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'groupList',
          groups: groupList
        }));
      }
    });
  }

  function handleIncomingMessage(peerId, message) {
    try {
      if (message.type === 'intro') {
        const peer = connectedPeers.get(peerId);
        if (peer) {
          peer.name = message.name;
        } else {
          const outgoingStream = outgoingStreams.get(peerId);
          connectedPeers.set(peerId, { name: message.name, stream: outgoingStream });
        }
        addLog(`${message.name} connected`);
        updatePeerList();
        updateGroupList();

      } else if (message.type === 'chat') {
        const peer = connectedPeers.get(peerId);
        const senderName = peer ? peer.name : 'Unknown';

        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'message',
              from: senderName,
              fromId: peerId,
              content: message.content,
              id: message.id,
              timestamp: new Date().toISOString()
            }));
          }
        });

      }


      else if (message.type === 'groupMessage') {
        const peer = connectedPeers.get(peerId);
        const senderName = peer ? peer.name : 'Unknown';

        const group = groups.get(message.groupId);
        if (group) {
          const isMember = group.members.some(member => member.id === myPeerId);
          if (isMember) {
            wss.clients.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'groupMessage',
                  from: senderName,
                  fromId: peerId,
                  content: message.content,
                  id: message.id,
                  groupId: message.groupId,
                  timestamp: new Date().toISOString()
                }));
              }
            });
          }
        }
      } else if (message.type === 'fileShare') {
        const peer = connectedPeers.get(peerId);
        const senderName = peer ? peer.name : 'Unknown';

        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'fileShare',
              from: senderName,
              fromId: peerId,

              fileName: message.fileName,
              fileSize: message.fileSize,
              fileType: message.fileType,
              fileData: message.fileData,
              timestamp: new Date().toISOString()
            }));
          }
        });

      } else if (message.type === 'groupFileShare') {
        const peer = connectedPeers.get(peerId);
        const senderName = peer ? peer.name : 'Unknown';

        // Check if this peer is a member of the group
        const group = groups.get(message.groupId);
        if (group) {
          const isMember = group.members.some(member => member.id === myPeerId);

          if (isMember) {
            wss.clients.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'groupFileShare',
                  from: senderName,
                  fromId: peerId,
                  id: message.id,
                  fileName: message.fileName,
                  fileSize: message.fileSize,
                  fileType: message.fileType,
                  fileData: base64url.encode(message.fileData),
                  groupId: message.groupId,
                  timestamp: new Date().toISOString()
                }));
              }
            });
          }
        }

      } else if (message.type === 'groupCreated') {
        const group = message.group;

        // Only add the group if we're a member or if it doesn't exist
        if (!groups.has(group.id)) {
          const isMember = group.members.some(member => member.id === myPeerId);
          if (isMember) {
            groups.set(group.id, group);
            addLog(`Added to group "${group.name}" created by ${message.createdBy}`);
            updateGroupList();
          }
        }

      } else if (message.type === 'groupInvite') {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'groupInvite',
              group: message.group,
              invitedBy: message.invitedBy
            }));
          }
        });
      } else if (message.type === 'editMessage') {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'editMessage',
              messageId: message.messageId,
              newContent: message.newContent,
              fromId: peerId
            }));
          }
        });
      } else if (message.type === 'deleteMessage') {
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'deleteMessage',
              messageId: message.messageId,
              fromId: peerId
            }));
          }
        });
      }
    } catch (err) {
      addLog(`Error handling message from ${peerId}: ${err.message}`);
    }
  }

  libp2p.handle(protocol, async ({ stream, connection }) => {
    const peerId = connection.remotePeer.toString();
    const outgoingStream = pushable();
    outgoingStreams.set(peerId, outgoingStream);

    const introMessage = JSON.stringify({ type: 'intro', name, peerId: myPeerId });
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
          handleIncomingMessage(peerId, message);
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
    if (connectedPeers.has(peerId) || pendingConnections.has(peerId) || peerId === myPeerId) return;

    pendingConnections.add(peerId);
    addLog(`Discovered peer: ${getLastFourDigits(peerId)}`);

    try {
      const stream = await libp2p.dialProtocol(evt.detail.id, protocol);
      const outgoingStream = pushable();
      outgoingStreams.set(peerId, outgoingStream);

      const introMessage = JSON.stringify({ type: 'intro', name, peerId: myPeerId });
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
            handleIncomingMessage(peerId, message);
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
    pendingConnections.delete(peerId);

    const stream = outgoingStreams.get(peerId);
    if (stream) {
      try {
        stream.end();
      } catch (err) {
        // Ignore errors when ending stream
      }
      outgoingStreams.delete(peerId);
    }

    // Remove peer from all groups
    groups.forEach((group, groupId) => {
      group.members = group.members.filter(member => member.id !== peerId);
      if (group.members.length === 0 && group.createdBy !== name) {
        groups.delete(groupId);
      }
    });

    updatePeerList();
    updateGroupList();
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
      const chatMessage = JSON.stringify({ type: 'chat', content: message, id: uuidv4() });
      stream.push(fromString(chatMessage));
      addLog(`Message sent to ${connectedPeers.get(targetPeerId)?.name || 'Unknown'}`);
      return true;
    } catch (err) {
      addLog(`Failed to send message to ${targetPeerId}: ${err.message}`);
      cleanupPeer(targetPeerId);
      return false;
    }
  }

  async function sendGroupMessage(message, groupId) {
    const group = groups.get(groupId);
    if (!group) {
      addLog(`Group ${groupId} not found`);
      return false;
    }

    const groupMessage = JSON.stringify({
      type: 'groupMessage',
      content: message,
      groupId: groupId,
      id: uuidv4()
    });

    let sentCount = 0;

    // Send to all group members
    for (const member of group.members) {
      if (member.id !== myPeerId) { // Don't send to self
        const stream = outgoingStreams.get(member.id);
        if (stream) {
          try {
            stream.push(fromString(groupMessage));
            sentCount++;
          } catch (err) {
            addLog(`Failed to send group message to ${member.name}: ${err.message}`);
            cleanupPeer(member.id);
          }
        }
      }
    }

    addLog(`Group message sent to ${sentCount} members in "${group.name}"`);
    return true; // Return true even if sent to 0 peers (for local display)
  }

  async function sendFile(file, targetPeerId) {
    const stream = outgoingStreams.get(targetPeerId);
    if (!stream) {
      addLog(`No stream found for peer ${targetPeerId}`);
      return false;
    }

    try {
      const fileMessage = JSON.stringify({
        type: 'fileShare',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: file.data
      });
      stream.push(fromString(fileMessage));
      addLog(`File "${file.name}" sent to ${connectedPeers.get(targetPeerId)?.name || 'Unknown'}`);
      return true;
    } catch (err) {
      addLog(`Failed to send file to ${targetPeerId}: ${err.message}`);
      cleanupPeer(targetPeerId);
      return false;
    }
  }

  async function sendGroupFile(file, groupId) {
    const group = groups.get(groupId);
    if (!group) {
      addLog(`Group ${groupId} not found`);
      return false;
    }

    const fileMessage = JSON.stringify({
      type: 'groupFileShare',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileData: file.data,
      groupId: groupId
    });

    let sentCount = 0;

    // Send to all group members
    for (const member of group.members) {
      if (member.id !== myPeerId) { // Don't send to self
        const stream = outgoingStreams.get(member.id);
        if (stream) {
          try {
            stream.push(fromString(fileMessage));
            sentCount++;
          } catch (err) {
            addLog(`Failed to send file to ${member.name}: ${err.message}`);
            cleanupPeer(member.id);
          }
        }
      }
    }

    addLog(`File "${file.name}" sent to ${sentCount} members in "${group.name}"`);
    return true;
  }

  async function editMessage(messageId, newContent, targetPeerId) {
    const stream = outgoingStreams.get(targetPeerId);
    if (!stream) {
      addLog(`No stream found for peer ${targetPeerId}`);
      return false;
    }

    try {
      const editMessage = JSON.stringify({ type: 'editMessage', messageId, newContent });
      stream.push(fromString(editMessage));
      addLog(`Edit message sent to ${connectedPeers.get(targetPeerId)?.name || 'Unknown'}`);
      return true;
    } catch (err) {
      addLog(`Failed to send edit message to ${targetPeerId}: ${err.message}`);
      cleanupPeer(targetPeerId);
      return false;
    }
  }

  async function deleteMessage(messageId, targetPeerId) {
    const stream = outgoingStreams.get(targetPeerId);
    if (!stream) {
      addLog(`No stream found for peer ${targetPeerId}`);
      return false;
    }

    try {
      const deleteMessage = JSON.stringify({ type: 'deleteMessage', messageId });
      stream.push(fromString(deleteMessage));
      addLog(`Delete message sent to ${connectedPeers.get(targetPeerId)?.name || 'Unknown'}`);
      return true;
    } catch (err) {
      addLog(`Failed to send delete message to ${targetPeerId}: ${err.message}`);
      cleanupPeer(targetPeerId);
      return false;
    }
  }

  async function createGroup(groupName, selectedMembers, creatorName) {
    const groupId = uuidv4();

    // Add creator to the group members
    const allMembers = [
      { id: myPeerId, name: creatorName },
      ...selectedMembers
    ];

    const group = {
      id: groupId,
      name: groupName,
      members: allMembers,
      createdBy: creatorName,
      createdAt: new Date().toISOString()
    };

    groups.set(groupId, group);
    addLog(`Group "${groupName}" created with ${allMembers.length} members`);

    // Notify all selected members about the new group
    const groupCreatedMessage = JSON.stringify({
      type: 'groupCreated',
      group: group,
      createdBy: creatorName
    });

    for (const member of selectedMembers) {
      const stream = outgoingStreams.get(member.id);
      if (stream) {
        try {
          stream.push(fromString(groupCreatedMessage));
        } catch (err) {
          addLog(`Failed to notify ${member.name} about group creation: ${err.message}`);
        }
      }
    }

    updateGroupList();
    return group;
  }

  await libp2p.start();
  addLog(`libp2p node started as "${name}" with ID: ${getLastFourDigits(myPeerId)}`);

  libp2p.getMultiaddrs().forEach(addr => {
    addLog(`Listening on: ${addr.toString()}`);
  });

  return {
    libp2p,
    myPeerId,
    connectedPeers,
    outgoingStreams,
    pendingConnections,
    groups,
    sendMessage,
    sendGroupMessage,
    sendFile,          // Add this line
    sendGroupFile,
    createGroup,
    cleanupPeer,
    editMessage,
    deleteMessage,
    getLogs: () => logs
  };
}

const wss = new WebSocketServer({ port: 5000 });
let node = null;

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'start' && !node) {
        node = await createNode(data.name, wss);

        const peerList = Array.from(node.connectedPeers.entries()).map(([peerId, peer]) => ({
          id: peerId,
          name: peer.name
        }));

        const groupList = Array.from(node.groups.entries()).map(([groupId, group]) => ({
          id: groupId,
          name: group.name,
          members: group.members,
          createdBy: group.createdBy,
          createdAt: group.createdAt
        }));

        ws.send(JSON.stringify({
          type: 'nodeStarted',
          name: data.name,
          peerId: node.myPeerId,
          peers: peerList,
          groups: groupList
        }));

      } else if (data.type === 'sendMessage' && node) {
        const success = await node.sendMessage(data.message, data.targetPeerId);

        if (success) {
          ws.send(JSON.stringify({
            type: 'message',
            from: data.senderName,
            fromId: 'self',
            id: uuidv4(),
            content: data.message,
            timestamp: new Date().toISOString(),
            toId: data.targetPeerId
          }));
        }

      } else if (data.type === 'sendGroupMessage' && node) {
        const success = await node.sendGroupMessage(data.message, data.groupId);

        if (success) {
          ws.send(JSON.stringify({
            type: 'groupMessage',
            from: data.senderName,
            fromId: 'self',
            content: data.message,
            groupId: data.groupId,
            timestamp: new Date().toISOString()
          }));
        }

      } else if (data.type === 'sendFile' && node) {
        const file = { name: data.fileName, size: data.fileSize, type: data.fileType, data: data.fileData };
        const success = await node.sendFile(file, data.targetPeerId);

        if (success) {
          ws.send(JSON.stringify({
            type: 'fileShare',
            from: data.senderName,
            fromId: 'self',
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData,
            timestamp: new Date().toISOString(),
            toId: data.targetPeerId
          }));
        }

      } else if (data.type === 'sendGroupFile' && node) {
        const file = { name: data.fileName, size: data.fileSize, type: data.fileType, data: data.fileData };
        const success = await node.sendGroupFile(file, data.groupId);

        if (success) {
          ws.send(JSON.stringify({
            type: 'groupFileShare',
            from: data.senderName,
            fromId: 'self',
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData,
            groupId: data.groupId,
            timestamp: new Date().toISOString()
          }));
        }


      }else if (data.type === 'createGroup' && node) {
          const group = await node.createGroup(data.groupName, data.selectedMembers, data.creatorName);


          
          ws.send(JSON.stringify({
            type: 'groupCreated',
            group: group
          }));

        } else if (data.type === 'editMessage' && node) {
          const success = await node.editMessage(data.messageId, data.newContent, data.targetPeerId);
          if (success) {
            ws.send(JSON.stringify({
              type: 'editMessage',
              messageId: data.messageId,
              newContent: data.newContent,
              fromId: 'self',
              toId: data.targetPeerId
            }));
          }
        } else if (data.type === 'deleteMessage' && node) {
          const success = await node.deleteMessage(data.messageId, data.targetPeerId);
          if (success) {
            ws.send(JSON.stringify({
              type: 'deleteMessage',
              messageId: data.messageId,
              fromId: 'self',
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
            try {
              stream.end();
            } catch (err) {
              // Ignore errors when ending streams
            }
          }

          try {
            await node.libp2p.stop();
          } catch (err) { 
            console.error('Error stopping libp2p:', err);
          }

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
        ws.send(JSON.stringify({
          type: 'error',
          message: err.message
        }));
      }
    });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

wss.on('error', (err) => {
  console.error('WebSocket Server error:', err);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (node) {
    for (const stream of node.outgoingStreams.values()) {
      try {
        stream.end();
      } catch (err) {
        // Ignore errors
      }
    }
    try {
      await node.libp2p.stop();
    } catch (err) {
      console.error('Error stopping libp2p:', err);
    }
  }
  wss.close();
  process.exit(0);
});

console.log('WebSocket server started on port 5000');