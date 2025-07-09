import React, { useEffect, useRef, useState } from 'react';
import './App.css';

export default function App() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [name, setName] = useState('');
  const [privateChats, setPrivateChats] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const userName = prompt('Enter your name:') || 'Anonymous';
    if (userName) {
      setName(userName);
    }
  }, []);


  useEffect(() => {
    if (!name) return;
    const socket = new WebSocket('ws://localhost:5000');
    setWs(socket);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ type: 'start', name: name }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        if (!data.content.includes('Listening on')) {
          const peerName = activeChat || 'general';
          if (peerName === 'general') {
            setMessages(prev => [...prev, data.content]);
          } else {
            setPrivateChats(prev => ({
              ...prev,
              [peerName]: [...(prev[peerName] || []), data.content]
            }));
          }
        }
      } else if (data.type === 'connectedPeers') {
        setConnectedPeers(data.peers);
      } else if (data.type === 'nodeStarted') {
        setMessages(prev => [...prev, `🛰️ Node initialized as "${name}"`]);
      }
    };

    socket.onclose = () => setConnected(false);

    return () => socket.close();
  }, [name, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, privateChats, activeChat]);

  const sendInput = () => {
    if (input.trim()) {
      if (input.startsWith('/')) {
        ws.send(JSON.stringify({ type: 'input', input }));
      } else {
        if (activeChat) {
          setPrivateChats(prev => ({
            ...prev,
            [activeChat]: [...(prev[activeChat] || []), `💬 ${name}: ${input}`]
          }));
          ws.send(JSON.stringify({ type: 'broadcastMessage', message: input }));
        }
      }
      setInput('');
    }
  };

  const openPrivateChat = (peerName) => {
    setActiveChat(peerName);
    setPrivateChats(prev => ({
      ...prev,
      [peerName]: prev[peerName] || []
    }));
  };

  const goBack = () => {
    setActiveChat(null);
  };

  return (
    <div className="p-4 font-mono min-h-screen w-full" style={{ backgroundColor: '#F0E4D3' }}>
      <h1 className="text-3xl font-bold mb-4 text-center text-[#D9A299]">🚀 Libp2p LAN Chat</h1>

      <div className="flex flex-wrap gap-2 justify-center mb-4">
        <button className="bg-[#D9A299] text-white px-3 py-1 rounded" onClick={() => ws.send(JSON.stringify({ type: 'input', input: '/peers' }))}>👥 Peers</button>
        <button className="bg-[#D9A299] text-white px-3 py-1 rounded" onClick={() => ws.send(JSON.stringify({ type: 'input', input: '/broadcast' }))}>📂 Broadcast</button>
        <button className="bg-[#D9A299] text-white px-3 py-1 rounded" onClick={() => ws.send(JSON.stringify({ type: 'input', input: '/help' }))}>❓ Help</button>
        <button className="bg-red-300 text-white px-3 py-1 rounded" onClick={() => ws.send(JSON.stringify({ type: 'input', input: '/quit' }))}>❌ Quit</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-6 w-full">
        <div className="md:w-2/3 bg-white p-3 rounded shadow h-[500px] overflow-y-auto whitespace-pre-wrap">
          <div className="font-bold mb-1 text-[#D9A299]">
            {activeChat ? `💬 Chat with ${activeChat}` : '📄 Messages'}
          </div>
          {activeChat ? (
            privateChats[activeChat]?.map((msg, i) => <div key={i}>{msg}</div>)
          ) : (
            messages.map((msg, i) => <div key={i}>{msg}</div>)
          )}
          <div ref={messagesEndRef}></div>
        </div>

        <div className="md:w-1/3 bg-white p-3 rounded shadow text-sm">
          {activeChat ? (
            <button
              onClick={goBack}
              className="text-blue-600 underline hover:text-blue-800 mb-2"
            >⬅ Back to main</button>
          ) : (
            <>
              <h2 className="font-bold mb-2 text-[#D9A299]">🔗 Connected Peers</h2>
              {connectedPeers.length === 0 && <p className="text-gray-500">No peers connected</p>}
              {connectedPeers.map((peer, i) => (
                <div key={i} className="mb-1">
                  <button
                    onClick={() => openPrivateChat(peer.name)}
                    className="text-[#D9A299] underline hover:text-[#a8674f]"
                  >
                    {peer.name}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {activeChat && (
        <div className="flex mb-2 mt-4">
          <input
            className="flex-grow border border-[#D9A299] p-2 rounded-l"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInput()}
            placeholder={`Message to ${activeChat}`}
          />
          <button className="bg-[#D9A299] text-white px-4 py-2 rounded-r" onClick={sendInput}>Send</button>
        </div>
      )}
    </div>
  );
}