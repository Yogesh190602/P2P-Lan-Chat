# libp2p Chat Frontend

A React-based web frontend for the libp2p chat application that enables peer-to-peer messaging directly in the browser.

## Features

- **Web-based P2P Chat**: Chat directly in your browser without any central server
- **Real-time Messaging**: Instant message delivery using libp2p WebRTC and WebSockets
- **Peer Discovery**: Automatically discover and connect to other chat users
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Connection Status**: See who's online and connected in real-time

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Build

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## How It Works

1. **Browser Compatibility**: Uses WebRTC and WebSockets for browser-based P2P communication
2. **Peer Discovery**: Connects to bootstrap nodes to discover other peers
3. **Direct Communication**: Once connected, messages are sent directly between browsers
4. **No Server Required**: After initial bootstrap, all communication is peer-to-peer

## Technology Stack

- **React 18**: Modern React with hooks for state management
- **libp2p**: Core P2P networking library
- **WebRTC**: For direct browser-to-browser communication
- **WebSockets**: Fallback transport for NAT traversal
- **Vite**: Fast build tool and development server
- **CSS3**: Modern styling with animations and responsive design

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## Configuration

The application uses bootstrap nodes for initial peer discovery. You can modify the bootstrap list in `App.jsx`:

```javascript
bootstrap({
  list: [
    '/dns4/libp2p-bootstrap.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
    '/dns4/libp2p-bootstrap.io/tcp/443/wss/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
  ]
})
```

## Features in Detail

### User Interface
- Clean, modern design with gradient backgrounds
- Responsive layout that works on all screen sizes
- Smooth animations and transitions
- Real-time peer status indicators

### Messaging
- Real-time message delivery
- Message history during session
- Support for multiple connected peers
- Sender identification for each message

### Connection Management
- Automatic peer discovery through bootstrap nodes
- Connection status indicators
- Graceful handling of peer disconnections
- Real-time peer list updates

## Troubleshooting

### Common Issues

1. **Peers not connecting**: 
   - Check if both users are online
   - Verify bootstrap nodes are accessible
   - Check browser console for errors

2. **Messages not sending**:
   - Ensure at least one peer is connected
   - Check network connectivity
   - Verify WebRTC is supported in browser

3. **Performance issues**:
   - Close unnecessary browser tabs
   - Check available system resources
   - Ensure stable internet connection

### Development Tips

- Use browser developer tools to monitor WebRTC connections
- Check the console for libp2p debug messages
- Test with multiple browser windows/tabs locally
- Use different browsers to simulate different peers

## Deployment

The frontend can be deployed to any static hosting service:

1. Build the application: `npm run build`
2. Deploy the `dist` folder to your hosting provider
3. Ensure the hosting service supports HTTPS (required for WebRTC)

Popular deployment options:
- Vercel
- Netlify
- GitHub Pages
- Firebase Hosting

## Security Considerations

- All connections are encrypted using the Noise protocol
- WebRTC provides additional encryption for direct peer connections
- No messages are stored on any server
- All communication is ephemeral and session-based

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details