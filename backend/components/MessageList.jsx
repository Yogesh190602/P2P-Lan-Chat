export default function MessageList({ messages }) {
  return (
    <div className="bg-gray-800 rounded p-3 h-64 overflow-y-auto">
      {messages.map((msg, i) => (
        <div key={i} className="text-sm mb-1">{msg}</div>
      ))}
    </div>
  )
}
