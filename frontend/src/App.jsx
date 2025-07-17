"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MessageCircle } from "lucide-react"
import NamePrompt from "./components/NamePrompt"
import ConnectionStatus from "./components/Connection"
import Sidebar from "./components/Sidebar"
import { ChatWindow } from "./components/Chat"
import { GroupChatWindow, CreateGroupModal } from "./components/Group"
import SystemLogs from "./components/Logs"
import StorageDebug from "./components/StorageDebug"
import { saveMessage, getMessagesForPeer, saveGroupMessage, getAllGroupMessages, getMessageStats } from "./utils/db"
import { savePeer, getAllPeers, updatePeerOnlineStatus } from "./utils/peers"
import { initializeUser, saveUserName, getCurrentUser } from "./utils/user"

export default function App() {
  // Core state
  const [ws, setWs] = useState(null)
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState({ name: '', deviceId: '', isComplete: false })
  const [showNamePrompt, setShowNamePrompt] = useState(true)
  
  // Peer and group state
  const [connectedPeers, setConnectedPeers] = useState([]) // Current online peers
  const [allKnownPeers, setAllKnownPeers] = useState([]) // All known peers from DB
  const [groups, setGroups] = useState([])
  
  // Chat state
  const [activeChat, setActiveChat] = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [groupMessages, setGroupMessages] = useState({})
  
  // UI state
  const [input, setInput] = useState("")
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [selectedPeers, setSelectedPeers] = useState([])
  const [groupName, setGroupName] = useState("")
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [showMenuForMessageId, setShowMenuForMessageId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Refs
  const messagesEndRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  
  // Other state
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [peerIdToDeviceId, setPeerIdToDeviceId] = useState({})
  
  // Dark mode is default
  const darkMode = true

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, groupMessages, logs])

  // Handle click outside for message options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenuForMessageId && !event.target.closest(".message-options-menu")) {
        setShowMenuForMessageId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenuForMessageId])

  // Cleanup reconnection timeout
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  // Step 1: Initialize user on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        
        // Initialize user identity
        const userData = await initializeUser();
        setUser(userData);
        
        if (userData.isComplete) {
          console.log('✅ User setup complete, connecting...');
          setShowNamePrompt(false);
          await initializeConnection(userData.name, userData.deviceId);
        } else {
          console.log('❓ User setup incomplete, showing name prompt');
          setShowNamePrompt(true);
        }
        
        // Load all known peers from database
        await loadKnownPeers();
        
        // Log message statistics
        const stats = await getMessageStats();
        console.log('📊 Message Storage Statistics:', stats);
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        setConnectionError('Failed to initialize app. Please refresh.');
      }
    };

    initializeApp();
  }, []);

  // Load all known peers from database
  const loadKnownPeers = async () => {
    try {
      const peers = await getAllPeers();
      setAllKnownPeers(peers);
      console.log('📖 Loaded known peers:', peers.length);
    } catch (error) {
      console.error('❌ Error loading known peers:', error);
    }
  };

  // Update peer online status when connected peers change
  useEffect(() => {
    const updatePeerStatus = async () => {
      if (!user.deviceId) return;
      
      try {
        // Update all known peers to offline first
        const allPeers = await getAllPeers();
        await Promise.all(
          allPeers.map(peer => updatePeerOnlineStatus(peer.deviceId, false))
        );
        
        // Update connected peers to online and save their info
        await Promise.all(
          connectedPeers.map(async (peer) => {
            if (peer.deviceId && peer.name && peer.deviceId !== user.deviceId) {
              await savePeer(peer.deviceId, peer.name, true);
              await updatePeerOnlineStatus(peer.deviceId, true);
            }
          })
        );
        
        // Reload known peers to reflect changes
        await loadKnownPeers();
        
        console.log('🔄 Updated peer status for', connectedPeers.length, 'connected peers');
      } catch (error) {
        console.error('❌ Error updating peer status:', error);
      }
    };
    
    updatePeerStatus();
  }, [connectedPeers, user.deviceId]);

  // Step 3: Handle WebSocket messages with new flow
  const handleWebSocketMessage = useCallback(
    (data) => {
      try {
        if (data.type === "nodeStarted") {
          console.log('🚀 Node started, peers:', data.peers?.length || 0);
          setConnectedPeers(data.peers || []);
          
          // Build peer ID mapping
          const peerMapping = {};
          (data.peers || []).forEach(peer => {
            if (peer.id && peer.deviceId) {
              peerMapping[peer.deviceId] = peer.id;
            }
          });
          setPeerIdToDeviceId(peerMapping);
          
          setGroups(data.groups || []);
          
        } else if (data.type === "connectedPeers") {
          console.log('👥 Connected peers updated:', data.peers?.length || 0);
          setConnectedPeers(data.peers || []);
          
          // Build peer ID mapping
          const peerMapping = {};
          (data.peers || []).forEach(peer => {
            if (peer.id && peer.deviceId) {
              peerMapping[peer.deviceId] = peer.id;
            }
          });
          setPeerIdToDeviceId(peerMapping);
          
        } else if (data.type === "message") {
          console.log('📨 Received message:', data);
          
          // Step 6: Handle message storage with new structure
          const isOwnMessage = data.fromId === 'self';
          let fromId, toId;
          
          if (isOwnMessage) {
            // Message sent by me
            fromId = user.deviceId;
            const recipientPeer = connectedPeers.find(p => p.id === data.toId);
            toId = recipientPeer ? recipientPeer.deviceId : data.toId;
          } else {
            // Message received from another peer
            const senderPeer = connectedPeers.find(p => p.id === data.fromId);
            fromId = senderPeer ? senderPeer.deviceId : data.fromId;
            toId = user.deviceId; // Always use my device ID as toId for received messages
            
            // Save sender info if not already known
            if (fromId && data.from) {
              savePeer(fromId, data.from, true);
              console.log('👤 Saved peer info:', fromId, data.from);
            }
          }

          const messageObj = {
            id: data.id,
            fromId: fromId,
            toId: toId,
            content: data.content,
            type: 'text',
            timestamp: data.timestamp,
            isOwnMessage: isOwnMessage,
            from: data.from
          };
          
          // Save to IndexedDB immediately
          saveMessage(messageObj);
          
          // Update UI if this is the active chat
          if (activeChat && (activeChat.deviceId === fromId || activeChat.deviceId === toId)) {
            setChatMessages(prev => {
              const updated = [...prev, messageObj];
              return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
          }
          
          console.log('💾 Message saved and UI updated');
          
          // Reload known peers to show this peer in sidebar
          loadKnownPeers();
        } else if (data.type === "fileShare") {
          console.log('📁 Received file share:', data);
          
          // Handle file sharing with new structure
          const isOwnMessage = data.fromId === 'self';
          let fromId, toId;
          
          if (isOwnMessage) {
            // File sent by me
            fromId = user.deviceId;
            const recipientPeer = connectedPeers.find(p => p.id === data.toId);
            toId = recipientPeer ? recipientPeer.deviceId : data.toId;
          } else {
            // File received from another peer
            const senderPeer = connectedPeers.find(p => p.id === data.fromId);
            fromId = senderPeer ? senderPeer.deviceId : data.fromId;
            toId = user.deviceId; // Always use my device ID as toId for received files
            
            // Save sender info if not already known
            if (fromId && data.from) {
              savePeer(fromId, data.from, true);
              console.log('👤 Saved peer info for file:', fromId, data.from);
            }
          }

          const fileObj = {
            id: data.id,
            fromId: fromId,
            toId: toId,
            content: data.content,
            type: 'file',
            timestamp: data.timestamp,
            isOwnMessage: isOwnMessage,
            from: data.from,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData
          };
          
          // Save to IndexedDB immediately
          saveMessage(fileObj);
          
          // Update UI if this is the active chat
          if (activeChat && (activeChat.deviceId === fromId || activeChat.deviceId === toId)) {
            setChatMessages(prev => {
              const updated = [...prev, fileObj];
              return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
          }
          
          console.log('💾 File message saved and UI updated');
          
          // Reload known peers to show this peer in sidebar
          loadKnownPeers();
        } else if (data.type === "groupFileShare") {
          const groupMsgObj = {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === "self",
            groupId: data.groupId,
            isFile: true,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData,
            id: data.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
            fromId: data.fromId,
          };
          
          setGroupMessages((prev) => {
            const updated = [...(prev[data.groupId] || []), groupMsgObj];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [data.groupId]: updated,
            };
          });
          
          // Save group file message to IndexedDB
          saveGroupMessage(data.groupId, groupMsgObj);
          
        } else if (data.type === "groupMessage") {
          const groupMsgObj = {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === "self",
            groupId: data.groupId,
            id: data.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)),
            fromId: data.fromId,
          };
          
          setGroupMessages((prev) => {
            const updated = [...(prev[data.groupId] || []), groupMsgObj];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [data.groupId]: updated,
            };
          });
          
          // Save group message to IndexedDB
          saveGroupMessage(data.groupId, groupMsgObj);
        } else if (data.type === "groupCreated") {
          setGroups((prev) => {
            const exists = prev.some((g) => g.id === data.group.id)
            if (!exists) {
              return [...prev, data.group]
            }
            return prev
          })
          if (showCreateGroup) {
            setShowCreateGroup(false)
            setSelectedPeers([])
            setGroupName("")
            setIsCreatingGroup(false)
          }
        } else if (data.type === "logs") {
          setLogs(data.logs || [])
        } else if (data.type === "shutdown") {
          setConnected(false)
          setWs(null)
        } else if (data.type === "error") {
          console.error("Server error:", data.message)
          setConnectionError(data.message)
        } else if (data.type === "editMessage") {
          // Handle message editing for active chat
          if (activeChat) {
            setChatMessages(prev => 
              prev.map(msg => 
                msg.id === data.messageId 
                  ? { ...msg, content: data.newContent }
                  : msg
              )
            );
          }
        } else if (data.type === "deleteMessage") {
          // Handle message deletion for active chat
          if (activeChat) {
            setChatMessages(prev => 
              prev.filter(msg => msg.id !== data.messageId)
            );
          }
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err)
      }
    },
    [showCreateGroup, user.deviceId, connectedPeers, activeChat, loadKnownPeers],
  )

  // Step 2: Initialize WebSocket connection
  const initializeConnection = useCallback(async (userName, userDeviceId) => {
    try {
      console.log('🔗 Initializing WebSocket connection...');
      const socket = new WebSocket("ws://localhost:5000")
      setWs(socket)
      setIsReconnecting(false)

      socket.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnected(true)
        setConnectionError("")
        socket.send(JSON.stringify({ 
          type: "start", 
          name: userName.trim(), 
          deviceId: userDeviceId 
        }))
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (err) {
          console.error("Error parsing WebSocket message:", err)
        }
      }

      socket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setConnected(false)
        setWs(null)
        if (!isReconnecting) {
          setIsReconnecting(true)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (userName.trim()) {
              initializeConnection(userName, userDeviceId)
            }
          }, 3000)
        }
      }

      socket.onerror = (error) => {
        console.error("WebSocket error:", error)
        setConnectionError("Failed to connect to server. Make sure the server is running.")
      }
    } catch (err) {
      console.error("Error initializing connection:", err)
      setConnectionError("Failed to initialize connection.")
    }
  }, [isReconnecting, handleWebSocketMessage])

  // Handle name submission from prompt
  const handleNameSubmit = async (e) => {
    e.preventDefault()
    const nameInput = e.target.elements.name?.value || user.name;
    
    if (nameInput?.trim()) {
      try {
        console.log('📝 Submitting name:', nameInput.trim());
        
        // Save user name
        await saveUserName(nameInput.trim());
        
        // Update user state
        const updatedUser = { ...user, name: nameInput.trim(), isComplete: true };
        setUser(updatedUser);
        
        setShowNamePrompt(false);
        setConnectionError("");
        
        // Initialize connection
        await initializeConnection(nameInput.trim(), user.deviceId);
      } catch (error) {
        console.error('❌ Error submitting name:', error);
        setConnectionError('Failed to save name. Please try again.');
      }
    }
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setConnectionError("File size must be less than 10MB")
        return
      }
      setSelectedFile(file)
    }
  }

  const sendFile = async () => {
    if (!selectedFile || !ws || !connected || isUploading) return
    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const fileData = {
          type: activeChat ? "sendFile" : "sendGroupFile",
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
          fileData: reader.result.split(",")[1],
          targetPeerId: activeChat ? peerIdToDeviceId[activeChat.deviceId] : undefined,
          groupId: activeGroup?.id,
          senderName: user.name,
        }
        ws.send(JSON.stringify(fileData))
        setSelectedFile(null)
        setIsUploading(false)
      }
      reader.readAsDataURL(selectedFile)
    } catch (error) {
      console.error("Error sending file:", error)
      setConnectionError("Failed to send file")
      setIsUploading(false)
    }
  }

  const handleEditMessage = (message) => {
    if (!message.isOwnMessage) return
    const newContent = prompt("Enter new message content", message.content)
    if (newContent && newContent !== message.content) {
      ws.send(
        JSON.stringify({
          type: "editMessage",
          messageId: message.id,
          newContent: newContent,
          targetPeerId: peerIdToDeviceId[activeChat.deviceId],
        }),
      )
    }
  }

  const handleDeleteMessage = (message) => {
    if (!message.isOwnMessage) return
    if (window.confirm("Are you sure you want to delete this message?")) {
      ws.send(
        JSON.stringify({
          type: "deleteMessage",
          messageId: message.id,
          targetPeerId: peerIdToDeviceId[activeChat.deviceId],
        }),
      )
    }
  }

  const handleCopyMessage = (message) => {
    navigator.clipboard.writeText(message.content)
  }

  // Step 5: Open chat with a peer and load messages
  const openChat = async (peer) => {
    console.log('💬 Opening chat with:', peer.name, peer.deviceId);
    
    setActiveChat(peer)
    setActiveGroup(null)
    setShowLogs(false)
    setShowCreateGroup(false)
    
    try {
      // Load past messages from IndexedDB
      const messages = await getMessagesForPeer(user.deviceId, peer.deviceId);
      setChatMessages(messages);
      
      console.log('📜 Loaded', messages.length, 'messages for chat with', peer.name);
    } catch (error) {
      console.error('❌ Error loading messages for peer:', error);
      setChatMessages([]);
    }
  }

  const openGroup = async (group) => {
    setActiveGroup(group)
    setActiveChat(null)
    setShowLogs(false)
    setShowCreateGroup(false)
    
    // Load group messages from IndexedDB if not already loaded
    if (!groupMessages[group.id]) {
      try {
        const storedGroupMessages = await getAllGroupMessages(group.id);
        setGroupMessages((prev) => ({
          ...prev,
          [group.id]: storedGroupMessages,
        }));
      } catch (error) {
        console.error('Error loading group messages:', error);
        setGroupMessages((prev) => ({
          ...prev,
          [group.id]: [],
        }));
      }
    }
  }

  // Step 6: Send message with new structure
  const sendMessage = () => {
    if (input.trim() && ws && connected && !sendingMessage) {
      setSendingMessage(true)
      try {
        if (activeChat) {
          const targetPeerId = peerIdToDeviceId[activeChat.deviceId];
          const messageId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
          
          // Send message via WebSocket
          ws.send(JSON.stringify({
            type: "sendMessage",
            message: input.trim(),
            targetPeerId: targetPeerId,
            senderName: user.name,
          }));
          
          // Create message object with new structure
          const messageObj = {
            id: messageId,
            fromId: user.deviceId,
            toId: activeChat.deviceId,
            content: input.trim(),
            type: 'text',
            timestamp: new Date().toISOString(),
            isOwnMessage: true,
            from: user.name
          };
          
          // Save to IndexedDB immediately
          saveMessage(messageObj);
          
          // Update UI immediately
          setChatMessages(prev => {
            const updated = [...prev, messageObj];
            return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
          
          console.log('📤 Message sent and saved:', messageObj);
          
        } else if (activeGroup) {
          const groupMsgObj = {
            from: user.name,
            content: input.trim(),
            timestamp: new Date().toISOString(),
            isOwnMessage: true,
            groupId: activeGroup.id,
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            fromId: 'self',
          };
          
          // Save sent group message to IndexedDB immediately
          saveGroupMessage(activeGroup.id, groupMsgObj);
          
          // Update group messages state immediately
          setGroupMessages((prev) => {
            const updated = [...(prev[activeGroup.id] || []), groupMsgObj];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [activeGroup.id]: updated,
            };
          });
          
          ws.send(
            JSON.stringify({
              type: "sendGroupMessage",
              message: input.trim(),
              groupId: activeGroup.id,
              senderName: user.name,
            }),
          )
        }
        setInput("")
        setTimeout(() => setSendingMessage(false), 500)
      } catch (error) {
        console.error("Error sending message:", error)
        setConnectionError("Failed to send message. Please try again.")
        setSendingMessage(false)
      }
    } else if (!connected) {
      setConnectionError("Not connected to the network. Please check your connection.")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const togglePeerSelection = (peer) => {
    setSelectedPeers((prev) =>
      prev.some((p) => p.deviceId === peer.deviceId) ? prev.filter((p) => p.deviceId !== peer.deviceId) : [...prev, { ...peer, id: peerIdToDeviceId[peer.deviceId] || peer.id }],
    )
  }

  const createGroup = () => {
    if (groupName.trim() && selectedPeers.length > 0 && ws && connected) {
      setIsCreatingGroup(true)
      ws.send(
        JSON.stringify({
          type: "createGroup",
          groupName: groupName.trim(),
          selectedMembers: selectedPeers.map(p => ({ id: peerIdToDeviceId[p.deviceId] || p.id, name: p.name })),
          creatorName: user.name,
        }),
      )
    }
  }

  const goHome = () => {
    setActiveChat(null)
    setActiveGroup(null)
    setShowLogs(false)
    setShowCreateGroup(false)
  }

  const toggleLogs = () => {
    if (!showLogs && ws && connected) {
      ws.send(JSON.stringify({ type: "getLogs" }))
    }
    if (showLogs) {
      setLogs([])
    }
    setShowLogs(!showLogs)
    setActiveChat(null)
    setActiveGroup(null)
    setShowCreateGroup(false)
  }

  const handleQuit = () => {
    if (ws && connected) {
      ws.send(JSON.stringify({ type: "quit" }))
    }
  }

  const cancelCreateGroup = () => {
    setShowCreateGroup(false)
    setSelectedPeers([])
    setGroupName("")
    setIsCreatingGroup(false)
  }

  const refreshConnection = () => {
    if (ws) {
      ws.close()
    }
    setConnectionError("")
    setTimeout(() => {
      initializeConnection()
    }, 500)
  }


  // Step 4: Show unique connected peers by device ID
  const onlineDeviceIds = new Set();
  connectedPeers.forEach((peer) => {
    if (peer.deviceId) onlineDeviceIds.add(peer.deviceId);
  });

  // Build unique peer list from all known peers, excluding self
  const peerListWithStatus = allKnownPeers
    .filter(peer => peer.deviceId !== user.deviceId)
    .map(peer => ({
      deviceId: peer.deviceId,
      name: peer.name,
      isOnline: onlineDeviceIds.has(peer.deviceId),
      lastSeen: peer.lastSeen
    }));

  console.log('📊 Peer list with status:', peerListWithStatus);

  const filteredPeers = peerListWithStatus.filter((peer) => 
    peer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredGroups = groups.filter((group) => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showNamePrompt) {
    return (
      <NamePrompt
        name={user.name}
        setName={(newName) => setUser(prev => ({ ...prev, name: newName }))}
        handleNameSubmit={handleNameSubmit}
        connectionError={connectionError}
        darkMode={darkMode}
      />
    )
  }

  if (!connected) {
    return (
      <ConnectionStatus
        connected={connected}
        isReconnecting={isReconnecting}
        connectionError={connectionError}
        refreshConnection={refreshConnection}
        darkMode={darkMode}
      />
    )
  }

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${darkMode ? "bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900" : ""}`}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative flex h-screen">
        <Sidebar
          name={user.name}
          connected={connected}
          darkMode={darkMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredPeers={filteredPeers}
          openChat={openChat}
          activeChat={activeChat}
          filteredGroups={filteredGroups}
          openGroup={openGroup}
          activeGroup={activeGroup}
          setShowCreateGroup={setShowCreateGroup}
          toggleLogs={toggleLogs}
          showLogs={showLogs}
          handleQuit={handleQuit}
        />

        <div className="flex-1 flex flex-col relative ml-80">
          {!activeChat && !activeGroup && !showLogs && !showCreateGroup && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="relative inline-flex items-center justify-center w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl rotate-12 animate-spin-slow"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl -rotate-12 animate-spin-slow animation-delay-1500"></div>
                  <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-5 shadow-lg">
                    <MessageCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2
                  className={`text-3xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent`}
                >
                  {"Welcome to Thenians Chat"}
                </h2>
                <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  {"Select a conversation or create a group to begin."}
                </p>
              </div>
            </div>
          )}

          {activeChat && (
            <ChatWindow
              activeChat={activeChat}
              chatMessages={chatMessages}
              darkMode={darkMode}
              messagesEndRef={messagesEndRef}
              input={input}
              setInput={setInput}
              handleKeyPress={handleKeyPress}
              sendMessage={sendMessage}
              sendingMessage={sendingMessage}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              fileInputRef={fileInputRef}
              handleFileSelect={handleFileSelect}
              sendFile={sendFile}
              isUploading={isUploading}
              handleEditMessage={handleEditMessage}
              handleDeleteMessage={handleDeleteMessage}
              handleCopyMessage={handleCopyMessage}
              hoveredMessage={hoveredMessage}
              setHoveredMessage={setHoveredMessage}
              showMenuForMessageId={showMenuForMessageId}
              setShowMenuForMessageId={setShowMenuForMessageId}
              goHome={goHome}
            />
          )}

          {activeGroup && (
            <GroupChatWindow
              activeGroup={activeGroup}
              groupMessages={groupMessages}
              darkMode={darkMode}
              messagesEndRef={messagesEndRef}
              input={input}
              setInput={setInput}
              handleKeyPress={handleKeyPress}
              sendMessage={sendMessage}
              sendingMessage={sendingMessage}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              fileInputRef={fileInputRef}
              handleFileSelect={handleFileSelect}
              sendFile={sendFile}
              isUploading={isUploading}
              goHome={goHome}
            />
          )}

          {showCreateGroup && (
            <CreateGroupModal
              showCreateGroup={showCreateGroup}
              cancelCreateGroup={cancelCreateGroup}
              groupName={groupName}
              setGroupName={setGroupName}
              connectedPeers={connectedPeers}
              togglePeerSelection={togglePeerSelection}
              selectedPeers={selectedPeers}
              createGroup={createGroup}
              isCreatingGroup={isCreatingGroup}
              darkMode={darkMode}
            />
          )}

          {showLogs && (
            <SystemLogs showLogs={showLogs} logs={logs} messagesEndRef={messagesEndRef} darkMode={darkMode} />
          )}
        </div>
      </div>
      
      {/* Storage Debug Component */}
      <StorageDebug darkMode={darkMode} />
    </div>
  )
}
