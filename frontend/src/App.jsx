import React, { useEffect, useRef, useState } from 'react';
import { Users, MessageCircle, Plus, Send, Settings, Wifi, WifiOff, ArrowLeft, Hash, Crown, Clock, Search, Filter, Moon, Sun, Volume2, VolumeX, MoreHorizontal, UserPlus, LogOut, RefreshCw, X, Check, Star, Zap, Shield, Globe, FileText, Paperclip, Download, Image, Video, File, Upload } from 'lucide-react';
import './App.css';


export default function App() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [groupMessages, setGroupMessages] = useState({});
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedPeers, setSelectedPeers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showMenuForMessageId, setShowMenuForMessageId] = useState(null);

  const handleEditMessage = (message) => {
    const newContent = prompt('Enter new message content', message.content);
    if (newContent && newContent !== message.content) {
      ws.send(JSON.stringify({
        type: 'editMessage',
        messageId: message.id,
        newContent: newContent,
        targetPeerId: activeChat.id
      }));
    }
  };

  const handleDeleteMessage = (message) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      ws.send(JSON.stringify({
        type: 'deleteMessage',
        messageId: message.id,
        targetPeerId: activeChat.id
      }));
    }
  };

  const handleCopyMessage = (message) => {
    navigator.clipboard.writeText(message.content);
  };
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, groupMessages, logs]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenuForMessageId && !event.target.closest('.message-options-menu')) {
        setShowMenuForMessageId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuForMessageId]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    // Validate file size (e.g., 10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setConnectionError('File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
  }
};

const sendFile = async () => {
  if (!selectedFile || !ws || !connected || isUploading) return;
  
  setIsUploading(true);
  try {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = {
        type: activeChat ? 'sendFile' : 'sendGroupFile',
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        fileData: reader.result.split(',')[1], // Remove data:mime;base64, prefix
        targetPeerId: activeChat?.id,
        groupId: activeGroup?.id,
        senderName: name
      };
      
      ws.send(JSON.stringify(fileData));
      setSelectedFile(null);
      setIsUploading(false);
    };
    reader.readAsDataURL(selectedFile);
  } catch (error) {
    console.error('Error sending file:', error);
    setConnectionError('Failed to send file');
    setIsUploading(false);
  }
};

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setShowNamePrompt(false);
      setConnectionError('');
      initializeConnection();
    }
  };

const initializeConnection = () => {
    try {
      const socket = new WebSocket('ws://localhost:5000');
      setWs(socket);
      setIsReconnecting(false);

      socket.onopen = () => {
        setConnected(true);
        setConnectionError('');
        socket.send(JSON.stringify({ type: 'start', name: name.trim() }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        setWs(null);
        
        if (!isReconnecting) {
          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (name.trim()) {
              initializeConnection();
            }
          }, 3000);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Failed to connect to server. Make sure the server is running.');
      };
    } catch (err) {
      console.error('Error initializing connection:', err);
      setConnectionError('Failed to initialize connection.');
    }
  };

  const handleWebSocketMessage = (data) => {
    try {
      if (data.type === 'nodeStarted') {
        setConnectedPeers(data.peers || []);
        setGroups(data.groups || []);
        
      } else if (data.type === 'connectedPeers') {
        setConnectedPeers(data.peers || []);
        
      } else if (data.type === 'groupList') {
        setGroups(data.groups || []);
        
      } else if (data.type === 'message') {
        const chatKey = data.fromId === 'self' ? data.toId : data.fromId;
        setChatMessages(prev => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] || []), {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === 'self',
            id: data.id
          }]
        }));
        
      } 

       else if (data.type === 'fileShare') {
        const chatKey = data.fromId === 'self' ? data.toId : data.fromId;
        setChatMessages(prev => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] || []), {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === 'self',
            isFile: true,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData
          }]
        }));
      } else if (data.type === 'groupFileShare') {
        setGroupMessages(prev => ({
          ...prev,
          [data.groupId]: [...(prev[data.groupId] || []), {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === 'self',
            groupId: data.groupId,
            isFile: true,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            fileData: data.fileData
          }]
        }));
      }
      
      
      else if (data.type === 'groupMessage') {
        setGroupMessages(prev => ({
          ...prev,
          [data.groupId]: [...(prev[data.groupId] || []), {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === 'self',
            groupId: data.groupId
          }]
        }));
        
      } else if (data.type === 'groupCreated') {
        setGroups(prev => {
          const exists = prev.some(g => g.id === data.group.id);
          if (!exists) {
            return [...prev, data.group];
          }
          return prev;
        });
        
        if (showCreateGroup) {
          setShowCreateGroup(false);
          setSelectedPeers([]);
          setGroupName('');
          setIsCreatingGroup(false);
        }
        
      } else if (data.type === 'logs') {
        setLogs(data.logs || []);
        
      } else if (data.type === 'shutdown') {
        setConnected(false);
        setWs(null);
        
      } else if (data.type === 'error') {
        console.error('Server error:', data.message);
        setConnectionError(data.message);
      } else if (data.type === 'editMessage') {
        const chatKey = data.fromId === 'self' ? data.toId : data.fromId;
        setChatMessages(prev => ({
          ...prev,
          [chatKey]: prev[chatKey] ? prev[chatKey].map(msg => 
            msg.id === data.messageId ? { ...msg, content: data.newContent } : msg
          ) : []
        }));
      } else if (data.type === 'deleteMessage') {
        const chatKey = data.fromId === 'self' ? data.toId : data.fromId;
        setChatMessages(prev => ({
          ...prev,
          [chatKey]: prev[chatKey] ? prev[chatKey].filter(msg => msg.id !== data.messageId) : []
        }));
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  };

  const MessageOptions = ({ message, onEdit, onDelete, onCopy }) => {
    return (
      <div className="message-options-menu absolute top-0 right-0 mt-2 mr-2 bg-white rounded-lg shadow-lg z-10">
        <button onClick={onEdit} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Edit</button>
        <button onClick={onDelete} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Delete</button>
        <button onClick={onCopy} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Copy</button>
      </div>
    );
  };

  const FileMessage = ({ message }) => {
  const downloadFile = () => {
    const blob = new Blob([Uint8Array.from(atob(message.fileData), c => c.charCodeAt(0))], {
      type: message.fileType
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = message.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = message.fileType.startsWith('image/');

  return (
    <div className="space-y-2">
      {isImage ? (
        <div className="relative">
          <img 
            src={`data:${message.fileType};base64,${message.fileData}`}
            alt={message.fileName}
            className="max-w-xs rounded-lg shadow-md"
          />
          <button
            onClick={downloadFile}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
          <FileText className="w-6 h-6 text-blue-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.fileName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(message.fileSize)}</p>
          </div>
          <button
            onClick={downloadFile}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
};

  const openChat = (peer) => {
    setActiveChat(peer);
    setActiveGroup(null);
    setShowLogs(false);
    setShowCreateGroup(false);
    
    if (!chatMessages[peer.id]) {
      setChatMessages(prev => ({
        ...prev,
        [peer.id]: []
      }));
    }
  };

  const openGroup = (group) => {
    setActiveGroup(group);
    setActiveChat(null);
    setShowLogs(false);
    setShowCreateGroup(false);
    
    if (!groupMessages[group.id]) {
      setGroupMessages(prev => ({
        ...prev,
        [group.id]: []
      }));
    }
  };

  const sendMessage = () => {
    if (input.trim() && ws && connected && !sendingMessage) {
      setSendingMessage(true);
      try {
        if (activeChat) {
          ws.send(JSON.stringify({
            type: 'sendMessage',
            message: input.trim(),
            targetPeerId: activeChat.id,
            senderName: name
          }));
          console.log(`Sending message to ${activeChat.name}: ${input.trim()}`);
        } else if (activeGroup) {
          ws.send(JSON.stringify({
            type: 'sendGroupMessage',
            message: input.trim(),
            groupId: activeGroup.id,
            senderName: name
          }));
          console.log(`Sending group message to ${activeGroup.name}: ${input.trim()}`);
        }
        setInput('');
        // Reset sending state after a short delay
        setTimeout(() => setSendingMessage(false), 500);
      } catch (error) {
        console.error('Error sending message:', error);
        setConnectionError('Failed to send message. Please try again.');
        setSendingMessage(false);
      }
    } else if (!connected) {
      setConnectionError('Not connected to the network. Please check your connection.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const togglePeerSelection = (peer) => {
    setSelectedPeers(prev => 
      prev.some(p => p.id === peer.id)
        ? prev.filter(p => p.id !== peer.id)
        : [...prev, peer]
    );
  };

  const createGroup = () => {
    if (groupName.trim() && selectedPeers.length > 0 && ws && connected) {
      setIsCreatingGroup(true);
      ws.send(JSON.stringify({
        type: 'createGroup',
        groupName: groupName.trim(),
        selectedMembers: selectedPeers,
        creatorName: name
      }));
    }
  };

  const goHome = () => {
    setActiveChat(null);
    setActiveGroup(null);
    setShowLogs(false);
    setShowCreateGroup(false);
  };

  const toggleLogs = () => {
    if (!showLogs && ws && connected) {
      ws.send(JSON.stringify({ type: 'getLogs' }));
    }
    if (showLogs) {
      setLogs([]); // Clear logs when hiding
    }
    setShowLogs(!showLogs);
    setActiveChat(null);
    setActiveGroup(null);
    setShowCreateGroup(false);
  };

  const handleQuit = () => {
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'quit' }));
    }
  };

  const cancelCreateGroup = () => {
    setShowCreateGroup(false);
    setSelectedPeers([]);
    setGroupName('');
    setIsCreatingGroup(false);
  };

  const refreshConnection = () => {
    if (ws) {
      ws.close();
    }
    setConnectionError('');
    setTimeout(() => {
      initializeConnection();
    }, 500);
  };

  const filteredPeers = connectedPeers.filter(peer => 
    peer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showNamePrompt) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${
        darkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50'
      }`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative" >
          <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl opacity-20 blur-xl animate-pulse"></div>
          <div className={`relative backdrop-blur-xl rounded-3xl p-8 shadow-2xl border transition-all duration-500 max-w-md w-full ${
            darkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-white/20'
          }`}>
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl rotate-6 animate-spin-slow"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl -rotate-6 animate-spin-slow animation-delay-1000"></div>
                <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-4">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className={`text-4xl font-bold mb-2 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent`}>
                Thenians Chat
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Connect with your peers
              </p>
            </div>
            
            {connectionError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 animate-slide-in">
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{connectionError}</span>
              </div>
            )}
            
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Enter your name
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-6 py-4 rounded-2xl text-lg transition-all duration-300 focus:scale-105 focus:shadow-xl border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                      darkMode 
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="Your display name"
                    required
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-focus-within:scale-110">
                    <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={!name.trim()}
                className="w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl focus:shadow-xl hover:from-violet-700 hover:to-purple-700"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>Enter Chat</span>
                  <Zap className="w-5 h-5" />
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${
        darkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50'
      }`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl opacity-20 blur-xl animate-pulse"></div>
          <div className={`relative backdrop-blur-xl rounded-3xl p-8 shadow-2xl border transition-all duration-500 text-center ${
            darkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-white/20'
          }`}>
            <div className="mb-6 relative">
              {isReconnecting ? (
                <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full animate-spin"></div>
                  <div className="relative bg-white rounded-full p-3">
                    <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                  </div>
                </div>
              ) : (
                <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                  <div className="relative bg-white rounded-full p-3">
                    <WifiOff className="w-8 h-8 text-red-500" />
                  </div>
                </div>
              )}
            </div>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isReconnecting ? 'Reconnecting...' : 'Connection Lost'}
            </h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isReconnecting ? 'Attempting to reconnect to the network...' : 'Unable to connect to the chat network'}
            </p>
            {connectionError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-in">
                <span className="text-red-700 text-sm">{connectionError}</span>
              </div>
            )}
            <button
              onClick={refreshConnection}
              className="py-3 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 focus:scale-105 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl focus:shadow-xl"
            >
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="w-5 h-5" />
                <span>Retry Connection</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-700 ${
      darkMode ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50'
    }`}>
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative flex h-screen">
        {/* Sidebar */}
        <div className={`w-80 transition-all duration-500 flex flex-col border-r fixed left-0 top-0 h-screen z-10 ${
          darkMode ? 'bg-gray-800 border-gray-700/50' : 'bg-white border-white/20'
        }`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white animate-pulse ${
                    connected ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {name}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} ${connected ? 'animate-pulse' : ''}`}></div>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {connected ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                    darkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title="Toggle dark mode"
                >
                  {darkMode ? (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center transition-all duration-300 group-focus-within:scale-110">
                  <Search className="w-4 h-4 text-white" />
                </div>
              </div>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-14 pr-4 py-3 rounded-2xl transition-all duration-300 focus:scale-105 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                  darkMode 
                    ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>
          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Direct Messages
                </h3>
                <span className={`text-xs px-3 py-1 rounded-full ${
                  darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {filteredPeers.length}
                </span>
              </div>
              
              {filteredPeers.map((peer) => (
                <button
                  key={peer.id}
                  onClick={() => openChat(peer)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg group ${
                    activeChat?.id === peer.id 
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' 
                      : darkMode 
                        ? 'hover:bg-gray-700/50' 
                        : 'hover:bg-white/80'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      activeChat?.id === peer.id 
                        ? 'bg-white/20' 
                        : 'bg-gradient-to-r from-violet-500 to-purple-500'
                    }`}>
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{peer.name}</p>
                    <p className={`text-xs transition-all duration-300 ${
                      activeChat?.id === peer.id 
                        ? 'text-white/70' 
                        : darkMode 
                          ? 'text-gray-400' 
                          : 'text-gray-500'
                    }`}>
                      Available
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Group Chats
                </h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {filteredGroups.length}
                  </span>
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${
                      darkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-violet-600" />
                  </button>
                </div>
              </div>
              
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => openGroup(group)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg group ${
                    activeGroup?.id === group.id 
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' 
                      : darkMode 
                        ? 'hover:bg-gray-700/50' 
                        : 'hover:bg-white/80'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    activeGroup?.id === group.id 
                      ? 'bg-white/20' 
                      : 'bg-gradient-to-r from-violet-500 to-purple-500'
                  }`}>
                    <Hash className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">{group.name}</p>
                    <p className={`text-xs transition-all duration-300 ${
                      activeGroup?.id === group.id 
                        ? 'text-white/70' 
                        : darkMode 
                          ? 'text-gray-400' 
                          : 'text-gray-500'
                    }`}>
                      {group.members.length} members
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200/20" >
            <div className="flex space-x-2 h-16 items-center">
              <button
                onClick={toggleLogs}
                className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 ${
                  showLogs 
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">System</span>
                </div>
              </button>
              <button
                onClick={handleQuit}
                className={`py-3 px-4 rounded-2xl transition-all duration-300 hover:scale-110 ${
                  darkMode 
                    ? 'bg-gray-700/50 hover:bg-red-600/50 text-gray-300 hover:text-white' 
                    : 'bg-gray-100 hover:bg-red-500 text-gray-600 hover:text-white'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative ml-80">
          {/* Welcome Screen */}
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
                <h2 className={`text-3xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent`}>
                  Welcome to Thenians Chat
                </h2>
                <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Select a conversation or create a group to begin.
                </p>
              </div>
            </div>
          )}

          {/* Active Chat */}
          {activeChat && (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className={`p-4 border-b transition-all duration-500 sticky top-0 w-full z-30 ${darkMode ? 'border-gray-700/50 bg-gray-800' : 'border-gray-200/80 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={goHome}
                      className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowLeft className="w-5 h-5 text-violet-600" />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activeChat.name}
                      </h2>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Online
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}>
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              

              {/* Chat Messages */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? 'bg-[#111827]' : ''}`} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
                {(chatMessages[activeChat.id] || []).map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'} items-start`}
                    onMouseEnter={() => setHoveredMessage(message)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    {/* Menu for received messages (left side) */}
                    {!message.isOwnMessage && hoveredMessage === message && (
                      <div className="relative self-center mr-2">
                        <button
                          onClick={() => setShowMenuForMessageId(showMenuForMessageId === message.id ? null : message.id)}
                          className="p-1 rounded-full hover:bg-gray-200/50"
                        >
                          <MoreHorizontal className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                        </button>
                        {showMenuForMessageId === message.id && (
                          <MessageOptions
                            message={message}
                            onEdit={() => { handleEditMessage(message); setShowMenuForMessageId(null); }}
                            onDelete={() => { handleDeleteMessage(message); setShowMenuForMessageId(null); }}
                            onCopy={() => { handleCopyMessage(message); setShowMenuForMessageId(null); }}
                          />
                        )}
                      </div>
                    )}

                    <div className={`relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                      message.isOwnMessage
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                        : darkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-white text-gray-900'
                    }`}>
                      {message.isFile ? (
                        <FileMessage message={message} />
                      ) : (
                        <p className="text-sm message-content">{message.content}</p>
                      )}
                      <p className={`text-xs mt-1 ${
                        message.isOwnMessage
                          ? 'text-white/70'
                          : darkMode
                            ? 'text-gray-400'
                            : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Menu for own messages (right side) */}
                    {message.isOwnMessage && hoveredMessage === message && (
                      <div className="relative self-center ml-2">
                        <button
                          onClick={() => setShowMenuForMessageId(showMenuForMessageId === message.id ? null : message.id)}
                          className="p-1 rounded-full hover:bg-gray-200/50"
                        >
                          <MoreHorizontal className="w-4 h-4 text-white" />
                        </button>
                        {showMenuForMessageId === message.id && (
                          <MessageOptions
                            message={message}
                            onEdit={() => { handleEditMessage(message); setShowMenuForMessageId(null); }}
                            onDelete={() => { handleDeleteMessage(message); setShowMenuForMessageId(null); }}
                            onCopy={() => { handleCopyMessage(message); setShowMenuForMessageId(null); }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className={`p-4 border-t sticky bottom-0 w-full z-20 ${darkMode ? 'border-gray-500/50 bg-gray-800' : 'border-gray-200/80 bg-white'}`}>
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center space-x-3 h-16">
                  {/* File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="*/*"
                  />
                  
                  {/* File Attach Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                      darkMode 
                        ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className={`w-full px-4 py-3 rounded-2xl resize-none transition-all duration-300 focus:scale-105 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                        darkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                      }`}
                      rows={1}
                    />
                  </div>
                  
                  {/* Send File Button */}
                  {selectedFile && (
                    <button
                      onClick={sendFile}
                      disabled={isUploading}
                      className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send file"
                    >
                      {isUploading ? (
                        <Upload className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  
                  {/* Send Message Button */}
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sendingMessage}
                    className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Group */}
          {activeGroup && (
            <div className="flex-1 flex flex-col">
              {/* Group Header */}
              <div className={`p-4 border-b transition-all duration-500 sticky top-0 w-full z-30 ${darkMode ? 'border-gray-700/50 bg-gray-800' : 'border-gray-200/80 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={goHome}
                      className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}
                    >
                      <ArrowLeft className="w-5 h-5 text-violet-600" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                      <Hash className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {activeGroup.name}
                      </h2>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {activeGroup.members.length} members
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Messages */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? 'bg-[#111827]' : ''}`} style={{ paddingTop: '80px', paddingBottom: '80px' }}>
                {(groupMessages[activeGroup.id] || []).map((message, index) => (
                  <div key={index} className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                      message.isOwnMessage 
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white' 
                        : darkMode 
                          ? 'bg-gray-700 text-white' 
                          : 'bg-white text-gray-900'
                    }`}>
                      {!message.isOwnMessage && (
                        <p className={`text-xs font-semibold mb-1 ${
                          darkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {message.from}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.isOwnMessage 
                          ? 'text-white/70' 
                          : darkMode 
                            ? 'text-gray-400' 
                            : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Group Input */}
              <div className={`p-4 border-t sticky bottom-0 w-full z-20 ${darkMode ? 'border-gray-700/50 bg-gray-800' : 'border-gray-200/80 bg-white'}`}>
                {/* File Preview */}
                {selectedFile && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center space-x-3 h-16">
                  {/* File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="*/*"
                  />
                  
                  {/* File Attach Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3 rounded-xl transition-all duration-300 hover:scale-110 ${
                      darkMode 
                        ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                    title="Attach file"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className={`w-full px-4 py-3 rounded-2xl resize-none transition-all duration-300 focus:scale-105 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                        darkMode 
                          ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                      }`}
                      rows={1}
                    />
                  </div>
                  
                  {/* Send File Button */}
                  {selectedFile && (
                    <button
                      onClick={sendFile}
                      disabled={isUploading}
                      className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send file"
                    >
                      {isUploading ? (
                        <Upload className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  
                  {/* Send Message Button */}
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sendingMessage}
                    className="p-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Group Modal */}
          {showCreateGroup && (
            <div className="flex-1 flex flex-col">
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200/80'}`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Create Group
                  </h2>
                  <button
                    onClick={cancelCreateGroup}
                    className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'}`}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 p-4 space-y-6">
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    className={`w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:scale-105 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                      darkMode 
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Select Members
                  </label>
                  <div className="space-y-2">
                    {connectedPeers.map((peer) => (
                      <button
                        key={peer.id}
                        onClick={() => togglePeerSelection(peer)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 hover:scale-105 ${
                          selectedPeers.some(p => p.id === peer.id)
                            ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg'
                            : darkMode 
                              ? 'bg-gray-700/50 hover:bg-gray-600/50' 
                              : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                            <MessageCircle className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-medium">{peer.name}</span>
                        </div>
                        {selectedPeers.some(p => p.id === peer.id) && (
                          <Check className="w-5 h-5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={createGroup}
                  disabled={!groupName.trim() || selectedPeers.length === 0 || isCreatingGroup}
                  className="w-full py-3 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
                >
                  {isCreatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          )}

          {/* System Logs */}
          {showLogs && (
            <div className="flex-1 flex flex-col">
              <div className={`p-4 border-b ${darkMode ? 'border-gray-700/50' : 'border-gray-200/80'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    System Logs
                  </h2>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-white/80'}`}>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {log.message}
                        </p>
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}