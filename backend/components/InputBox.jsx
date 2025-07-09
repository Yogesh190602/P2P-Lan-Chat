export default function InputBox({ sendInput, inputRef }) {
  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Type a message or command..."
      className="w-full p-2 rounded bg-gray-700 text-white"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          sendInput(e.target.value)
          e.target.value = ''
        }
      }}
    />
  )
}
