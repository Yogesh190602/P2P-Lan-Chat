import React, { useEffect, useRef, useState } from 'react';

export default function App() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, logs]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setShowNamePrompt(false);
      initializeConnection();
    }
  };

  const initializeConnection = () => {
    const socket = new WebSocket(`ws://${window.location.hostname}:5000`);

    setWs(socket);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: 'start', name: name.trim() }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'nodeStarted') {
        setConnectedPeers(data.peers);
      } else if (data.type === 'connectedPeers') {
        setConnectedPeers(data.peers);
      } else if (data.type === 'message') {
        const chatKey = data.fromId === 'self' ? data.toId : data.fromId;
        setChatMessages(prev => ({
          ...prev,
          [chatKey]: [...(prev[chatKey] || []), {
            from: data.from,
            content: data.content,
            timestamp: data.timestamp,
            isOwnMessage: data.fromId === 'self'
          }]
        }));
      } else if (data.type === 'logs') {
        setLogs(data.logs);
      } else if (data.type === 'shutdown') {
        setConnected(false);
        setWs(null);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      setWs(null);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const openChat = (peer) => {
    setActiveChat(peer);
    setShowLogs(false);
    if (!chatMessages[peer.id]) {
      setChatMessages(prev => ({
        ...prev,
        [peer.id]: []
      }));
    }
  };

  const sendMessage = () => {
    if (input.trim() && activeChat && ws) {
      ws.send(JSON.stringify({
        type: 'sendMessage',
        message: input.trim(),
        targetPeerId: activeChat.id,
        senderName: name
      }));
      setInput('');
    }
  };

  const goHome = () => {
    setActiveChat(null);
    setShowLogs(false);
  };

  const toggleLogs = () => {
    if (!showLogs && ws) {
      ws.send(JSON.stringify({ type: 'getLogs' }));
    }
    setShowLogs(!showLogs);
    setActiveChat(null);
  };

  const handleQuit = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'quit' }));
    }
  };

  if (showNamePrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-indigo-600">
            🚀 P2P Chat
          </h1>
          <div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Enter your name:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit(e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your name"
              />
            </div>
            <button
              onClick={handleNameSubmit}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition duration-200"
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Connecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">🚀 P2P Chat</h1>
              <span className="ml-4 text-sm text-gray-600">Welcome, {name}!</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={goHome}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
              >
                🏠 Home
              </button>
              <button
                onClick={toggleLogs}
                className={`px-4 py-2 rounded-md transition duration-200 ${
                  showLogs 
                    ? 'bg-gray-600 text-white hover:bg-gray-700' 
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                📋 {showLogs ? 'Hide Logs' : 'Show Logs'}
              </button>
              <button
                onClick={handleQuit}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200"
              >
                ❌ Quit
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showLogs ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">📋 System Logs</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
              <div ref={messagesEndRef}></div>
            </div>
          </div>
        ) : activeChat ? (
          <div className="bg-white rounded-lg shadow-lg h-[600px] flex flex-col">
            <div className="border-b px-6 py-4 bg-indigo-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-indigo-800">
                  💬 Chat with {activeChat.name}
                </h2>
                <button
                  onClick={goHome}
                  className="text-indigo-600 hover:text-indigo-800 transition duration-200"
                >
                  ⬅ Back
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {(chatMessages[activeChat.id] || []).map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.isOwnMessage
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <div className="font-medium text-sm mb-1">
                        {msg.isOwnMessage ? 'You' : msg.from}
                      </div>
                      <div>{msg.content}</div>
                      <div className="text-xs mt-1 opacity-75">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef}></div>
              </div>
            </div>
            
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message ${activeChat.name}...`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition duration-200"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-800">🔗 Connected Peers</h2>
            
            {connectedPeers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <p className="text-gray-600 text-lg">No peers connected</p>
                <p className="text-gray-500 text-sm mt-2">
                  Waiting for other peers to join the network...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedPeers.map((peer) => (
                  <div
                    key={peer.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200 cursor-pointer"
                    onClick={() => openChat(peer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-bold">
                            {peer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {peer.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Click to chat
                          </p>
                        </div>
                      </div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}