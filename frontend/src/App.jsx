"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MessageCircle } from "lucide-react"
import NamePrompt from "./components/NamePrompt"
import ConnectionStatus from "./components/Connection"
import Sidebar from "./components/Sidebar"
import { ChatWindow } from "./components/Chat" // Consolidated import
import { GroupChatWindow, CreateGroupModal } from "./components/Group"
import SystemLogs from "./components/Logs"
import { saveMessage, getAllMessages } from "./utils/db"
import { savePeer } from "./utils/peers"

export default function App() {
  const [ws, setWs] = useState(null)
  const [connected, setConnected] = useState(false)
  const [name, setName] = useState("")
  const [showNamePrompt, setShowNamePrompt] = useState(true)
  const [connectedPeers, setConnectedPeers] = useState([])
  const [groups, setGroups] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [chatMessages, setChatMessages] = useState({})
  const [groupMessages, setGroupMessages] = useState({})
  const [input, setInput] = useState("")
  const [logs, setLogs] = useState([])
  const [showLogs, setShowLogs] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [selectedPeers, setSelectedPeers] = useState([])
  const [groupName, setGroupName] = useState("")
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [showMenuForMessageId, setShowMenuForMessageId] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [deviceId, setDeviceId] = useState("")

  // Add a new state to track all known peers (from localStorage and from connectedPeers)
  const [allPeers, setAllPeers] = useState({});

  // Dark mode is default
  const darkMode = true

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, groupMessages, logs])

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

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Get deviceId from localStorage
    let storedDeviceId = localStorage.getItem("deviceId");
    let storedName = localStorage.getItem("userName");
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      localStorage.setItem("deviceId", storedDeviceId);
    }
    if (!storedName && name) {
      localStorage.setItem("userName", name);
    }
    setDeviceId(storedDeviceId);
    if (name) savePeer(storedDeviceId, name);

    // Load messages from IndexedDB for all known deviceIds (self + peers)
    const peersMap = JSON.parse(localStorage.getItem('peersMap') || '{}');
    const allIds = [storedDeviceId, ...Object.keys(peersMap).filter(id => id !== storedDeviceId)];
    Promise.all(allIds.map(id => getAllMessages(id))).then((allMsgs) => {
      // allMsgs is an array of arrays, flatten and group by chatKey (deviceId of the peer you are chatting with)
      const grouped = {};
      allMsgs.flat().forEach((msg) => {
        // Always use the deviceId of the peer you are chatting with as the chatKey
        // If I sent the message, chatKey is toId; if I received, chatKey is fromId
        const chatKey = msg.fromId === storedDeviceId ? msg.toId : msg.fromId;
        if (!grouped[chatKey]) grouped[chatKey] = [];
        grouped[chatKey].push(msg);
      });
      setChatMessages(grouped);
    });
  }, [name]);

  useEffect(() => {
    // On mount or when name changes, load all known peers from localStorage, but filter out self
    let peersMap = JSON.parse(localStorage.getItem('peersMap') || '{}');
    // Remove any accidental self entries (by deviceId or by name)
    if (deviceId) {
      delete peersMap[deviceId];
      // Remove any peer whose name matches my name (case-insensitive, trimmed)
      Object.keys(peersMap).forEach((id) => {
        if (
          peersMap[id] &&
          name &&
          peersMap[id].trim().toLowerCase() === name.trim().toLowerCase()
        ) {
          delete peersMap[id];
        }
      });
    }
    setAllPeers(peersMap);
    localStorage.setItem('peersMap', JSON.stringify(peersMap));
  }, [name, deviceId]);

  useEffect(() => {
    // Update allPeers when new peers are discovered (connectedPeers changes), but filter out self
    let peersMap = JSON.parse(localStorage.getItem('peersMap') || '{}');
    connectedPeers.forEach((peer) => {
      if (peer.id && peer.name) {
        peersMap[peer.id] = peer.name;
      }
    });
    // Remove any accidental self entries (by deviceId or by name)
    if (deviceId) {
      delete peersMap[deviceId];
      Object.keys(peersMap).forEach((id) => {
        if (
          peersMap[id] &&
          name &&
          peersMap[id].trim().toLowerCase() === name.trim().toLowerCase()
        ) {
          delete peersMap[id];
        }
      });
    }
    setAllPeers(peersMap);
    localStorage.setItem('peersMap', JSON.stringify(peersMap));
  }, [connectedPeers, deviceId, name]);

  const handleWebSocketMessage = useCallback(
    (data) => {
      try {
        if (data.type === "nodeStarted") {
          if (typeof setConnectedPeers === "function") setConnectedPeers(data.peers || []);
          if (typeof setGroups === "function") setGroups(data.groups || []);
          // Save all peers' deviceId/name
          (data.peers || []).forEach((peer) => {
            if (peer.id && peer.name) savePeer(peer.id, peer.name);
          });
        } else if (data.type === "connectedPeers") {
          if (typeof setConnectedPeers === "function") setConnectedPeers(data.peers || []);
          // Update peers' deviceId/name on reconnect
          (data.peers || []).forEach((peer) => {
            if (peer.id && peer.name) savePeer(peer.id, peer.name);
          });
        } else if (data.type === "message") {
          // Save sender info
          if (data.fromId && data.from) savePeer(data.fromId, data.from);
          // Use deviceId for 'self', otherwise use fromId
          const chatKey = data.fromId === deviceId ? data.toId : data.fromId;
          const msgObj = {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === deviceId,
            id: data.id,
            fromId: data.fromId,
            toId: data.toId,
          };
          setChatMessages((prev) => {
            // Always sort messages by timestamp ascending (oldest at top, newest at bottom)
            const updated = [...(prev[chatKey] || []), msgObj];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [chatKey]: updated,
            };
          })
          // Save to IndexedDB: always use the deviceId of the peer you are chatting with
          // Only store if the peer is not myself (never store under my own deviceId)
          if (data.fromId === deviceId && data.toId && data.toId !== deviceId) {
            // Sent by me: store under toId (the peer's deviceId)
            saveMessage(data.toId, msgObj);
          } else if (data.toId === deviceId && data.fromId && data.fromId !== deviceId) {
            // Received by me: store under fromId (the peer's deviceId)
            saveMessage(data.fromId, msgObj);
          }
        } else if (data.type === "fileShare") {
          const chatKey = data.fromId === "self" ? data.toId : data.fromId
          const msgObj = {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === "self",
            isFile: true,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData,
            id: data.id,
            fromId: data.fromId,
            toId: data.toId,
          };
          setChatMessages((prev) => {
            const updated = [...(prev[chatKey] || []), msgObj];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [chatKey]: updated,
            };
          })
          // Save to IndexedDB: always use the deviceId of the peer you are chatting with
          if (data.fromId === deviceId || data.fromId === "self") {
            // Sent by me: store under toId (the peer's deviceId)
            saveMessage(data.toId, msgObj);
          } else {
            // Received from peer: store under fromId (the peer's deviceId)
            saveMessage(data.fromId, msgObj);
          }
        } else if (data.type === "groupFileShare") {
          setGroupMessages((prev) => ({
            ...prev,
            [data.groupId]: [
              ...(prev[data.groupId] || []),
              {
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
              },
            ],
          }))
        } else if (data.type === "groupMessage") {
          setGroupMessages((prev) => ({
            ...prev,
            [data.groupId]: [
              ...(prev[data.groupId] || []),
              {
                from: data.from,
                content: data.content,
                timestamp: data.timestamp,
                isOwnMessage: data.fromId === "self",
                groupId: data.groupId,
              },
            ],
          }))
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
          const chatKey = data.fromId === "self" ? data.toId : data.fromId
          setChatMessages((prev) => {
            let updated = prev[chatKey]
              ? prev[chatKey].map((msg) => (msg.id === data.messageId ? { ...msg, content: data.newContent } : msg))
              : [];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [chatKey]: updated,
            };
          })
        } else if (data.type === "deleteMessage") {
          const chatKey = data.fromId === "self" ? data.toId : data.fromId
          setChatMessages((prev) => {
            let updated = prev[chatKey] ? prev[chatKey].filter((msg) => msg.id !== data.messageId) : [];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [chatKey]: updated,
            };
          })
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err)
      }
    },
    [showCreateGroup, deviceId],
  )

  const initializeConnection = useCallback(() => {
    try {
      const socket = new WebSocket("ws://localhost:5000")
      setWs(socket)
      setIsReconnecting(false)

      socket.onopen = () => {
        setConnected(true)
        setConnectionError("")
        socket.send(JSON.stringify({ type: "start", name: name.trim(), deviceId }))
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
        setConnected(false)
        setWs(null)
        if (!isReconnecting) {
          setIsReconnecting(true)
          reconnectTimeoutRef.current = setTimeout(() => {
            if (name.trim()) {
              initializeConnection()
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
  }, [name, isReconnecting, handleWebSocketMessage, deviceId])

  const handleNameSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      setShowNamePrompt(false)
      setConnectionError("")
      initializeConnection()
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
          targetPeerId: activeChat?.id,
          groupId: activeGroup?.id,
          senderName: name,
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
          targetPeerId: activeChat.id,
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
          targetPeerId: activeChat.id,
        }),
      )
    }
  }

  const handleCopyMessage = (message) => {
    navigator.clipboard.writeText(message.content)
  }

  const openChat = (peer) => {
    setActiveChat(peer)
    setActiveGroup(null)
    setShowLogs(false)
    setShowCreateGroup(false)
    if (!chatMessages[peer.id]) {
      setChatMessages((prev) => ({
        ...prev,
        [peer.id]: [],
      }))
    }
  }

  const openGroup = (group) => {
    setActiveGroup(group)
    setActiveChat(null)
    setShowLogs(false)
    setShowCreateGroup(false)
    if (!groupMessages[group.id]) {
      setGroupMessages((prev) => ({
        ...prev,
        [group.id]: [],
      }))
    }
  }

  const sendMessage = () => {
    if (input.trim() && ws && connected && !sendingMessage) {
      setSendingMessage(true)
      try {
        if (activeChat) {
          const msgObj = {
            type: "sendMessage",
            message: input.trim(),
            targetPeerId: activeChat.id,
            senderName: name,
          };
          ws.send(JSON.stringify(msgObj));
          // Save sent message to IndexedDB ONLY under the peer's deviceId (toId), not my own deviceId
          const localMsg = {
            from: name,
            content: input.trim(),
            timestamp: new Date().toISOString(),
            isOwnMessage: true,
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            fromId: deviceId,
            toId: activeChat.id,
          };
          if (activeChat && activeChat.id && activeChat.id !== deviceId) {
            saveMessage(activeChat.id, localMsg);
          }
          savePeer(deviceId, name);
          // Update chatMessages state immediately
          setChatMessages((prev) => {
            const chatKey = localMsg.fromId === deviceId ? localMsg.toId : localMsg.fromId;
            const updated = [...(prev[chatKey] || []), localMsg];
            updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            return {
              ...prev,
              [chatKey]: updated,
            };
          });
          // console.log(`Sending message to ${activeChat.name}: ${input.trim()}`)
        } else if (activeGroup) {
          ws.send(
            JSON.stringify({
              type: "sendGroupMessage",
              message: input.trim(),
              groupId: activeGroup.id,
              senderName: name,
            }),
          )
          // console.log(`Sending group message to ${activeGroup.name}: ${input.trim()}`)
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
      prev.some((p) => p.id === peer.id) ? prev.filter((p) => p.id !== peer.id) : [...prev, peer],
    )
  }

  const createGroup = () => {
    if (groupName.trim() && selectedPeers.length > 0 && ws && connected) {
      setIsCreatingGroup(true)
      ws.send(
        JSON.stringify({
          type: "createGroup",
          groupName: groupName.trim(),
          selectedMembers: selectedPeers,
          creatorName: name,
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


  // Group connectedPeers by deviceId, so that if multiple peers have the same deviceId, they are treated as one
  // allPeers is a map of deviceId -> name
  // connectedPeers is an array of { id: deviceId, name, peerId }
  // We'll show each deviceId only once, and online if any peer with that deviceId is online
  const onlineDeviceIds = new Set();
  connectedPeers.forEach((peer) => {
    if (peer.id) onlineDeviceIds.add(peer.id);
  });

  // Build a unique list of peers by deviceId, and filter out self (my deviceId) so my name never appears in DMs
  const peerListWithStatus = Object.entries(allPeers)
    .filter(([id]) => id !== deviceId)
    .map(([id, name]) => {
      const online = onlineDeviceIds.has(id);
      return { id, name, online };
    });

  const filteredPeers = peerListWithStatus.filter((peer) => peer.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredGroups = groups.filter((group) => group.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (showNamePrompt) {
    return (
      <NamePrompt
        name={name}
        setName={setName}
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
          name={name}
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
    </div>
  )
}
