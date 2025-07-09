# LibP2P Chat Backend

A peer-to-peer chat application using libp2p for decentralized communication.

## Features

- 🔗 Peer-to-peer messaging without servers
- 🔍 Automatic peer discovery using mDNS
- 📡 Broadcast messages to multiple peers
- 💬 Real-time chat with connected peers
- 🛡️ Secure communication with Noise encryption

## Installation

1. Make sure you have Node.js 18+ installed
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start a chat node with your name:
```bash
node chat.js "YourName"
```

### Commands

- `/peers` - Show connected peers
- `/discover` - Show discovered peers and connect
- `/broadcast` - Send message to multiple peers
- `/quit` - Exit the chat
- `/help` - Show help message

### Example

```bash
# Terminal 1
node chat.js "Alice"

# Terminal 2
node chat.js "Bob"
```

## How it Works

1. Each node creates a libp2p instance with TCP transport
2. Peers discover each other using mDNS on the local network
3. When peers are discovered, you can choose to connect
4. Once connected, you can send messages directly peer-to-peer
5. Messages are encrypted using Noise protocol

## Network Requirements

- All peers must be on the same local network
- mDNS must be enabled (usually default on most systems)
- Firewall may need to allow the application

## Dependencies

- `libp2p` - Core libp2p library
- `@libp2p/tcp` - TCP transport
- `@chainsafe/libp2p-noise` - Noise encryption
- `@chainsafe/libp2p-yamux` - Stream multiplexing
- `@libp2p/mdns` - mDNS peer discovery
- `it-pipe` - Async iterable piping
- `uint8arrays` - Uint8Array utilities
- `it-pushable` - Pushable async iterables