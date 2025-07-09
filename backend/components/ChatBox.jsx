import React from 'react'
import MessageList from './MessageList'
import PeerList from './PeerList'
import InputBox from './InputBox'

export default function ChatBox({ messages, inputRef, sendInput, connectedPeers, discoveredPeers }) {
  return (
    <div className="space-y-4">
      <MessageList messages={messages} />
      <PeerList connectedPeers={connectedPeers} discoveredPeers={discoveredPeers} />
      <InputBox sendInput={sendInput} inputRef={inputRef} />
    </div>
  )
}
