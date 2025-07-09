export default function PeerList({ connectedPeers, discoveredPeers }) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <h3 className="font-bold mb-1">Connected Peers</h3>
        {connectedPeers.length === 0 ? (
          <p className="text-gray-400">No peers connected</p>
        ) : (
          connectedPeers.map((p, i) => <div key={i}>✅ {p.name}</div>)
        )}
      </div>
      <div>
        <h3 className="font-bold mb-1">Discovered Peers</h3>
        {discoveredPeers.length === 0 ? (
          <p className="text-gray-400">No peers discovered</p>
        ) : (
          discoveredPeers.map((p, i) => <div key={i}>🔍 {p.name}</div>)
        )}
      </div>
    </div>
  )
}
