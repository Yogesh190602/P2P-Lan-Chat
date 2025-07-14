"use client"
import { ArrowLeft, MoreHorizontal, Paperclip, Send, Upload, X, MessageCircle, FileText, Download } from "lucide-react"

export function ChatWindow({
  activeChat,
  chatMessages,
  darkMode,
  messagesEndRef,
  input,
  setInput,
  handleKeyPress,
  sendMessage,
  sendingMessage,
  selectedFile,
  setSelectedFile,
  fileInputRef,
  handleFileSelect,
  sendFile,
  isUploading,
  handleEditMessage,
  handleDeleteMessage,
  handleCopyMessage,
  hoveredMessage,
  setHoveredMessage,
  showMenuForMessageId,
  setShowMenuForMessageId,
  goHome,
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div
        className={`p-4 border-b transition-all duration-500 sticky top-0 w-full z-30 ${darkMode ? "border-gray-700/50 bg-gray-800" : ""}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={goHome}
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? "hover:bg-gray-700/50" : ""}`}
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
              <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : ""}`}>{activeChat.name}</h2>
              <p className={`text-sm ${darkMode ? "text-gray-400" : ""}`}>{"Online"}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? "hover:bg-gray-700/50" : ""}`}
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? "bg-[#111827]" : ""}`}
        style={{ paddingTop: "80px", paddingBottom: "80px" }}
      >
        {(chatMessages[activeChat.id] || [])
          .slice() // copy to avoid mutating state
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"} items-start`}
            onMouseEnter={() => setHoveredMessage(message)}
            onMouseLeave={() => setHoveredMessage(null)}
          >
            {null} {/* Placeholder for menu for received messages (left side) */}
            <div
              className={`relative max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                message.isOwnMessage
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                  : darkMode
                    ? "bg-gray-700 text-white"
                    : ""
              }`}
            >
              {message.isFile ? (
                <FileMessage message={message} />
              ) : (
                <p className="text-sm message-content">{message.content}</p>
              )}
              <p className={`text-xs mt-1 ${message.isOwnMessage ? "text-white/70" : darkMode ? "text-gray-400" : ""}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
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
                    onEdit={() => {
                      handleEditMessage(message)
                      setShowMenuForMessageId(null)
                    }}
                    onDelete={() => {
                      handleDeleteMessage(message)
                      setShowMenuForMessageId(null)
                    }}
                    onCopy={() => {
                      handleCopyMessage(message)
                      setShowMenuForMessageId(null)
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={`p-4 border-t sticky bottom-0 w-full z-20 ${darkMode ? "border-gray-500/50 bg-gray-800" : ""}`}>
        {selectedFile && (
          <div className="mb-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} {"MB"}
              </span>
            </div>
            <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-3 h-16">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="*/*" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 transition-all text-white duration-300 hover:scale-110   ${
              darkMode ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:bg-gray-600/50 text-gray-300" : ""
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
              className={`w-full px-4 py-3 rounded-2xl resize-none transition-all duration-300 focus:scale-95 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                darkMode ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400" : ""
              }`}
              rows={1}
            />
          </div>
          {selectedFile && (
            <button
              onClick={sendFile}
              disabled={isUploading}
              className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send file"
            >
              {isUploading ? <Upload className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </button>
          )}
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
  )
}

export function MessageOptions({ message, onEdit, onDelete, onCopy }) {
  return (
    <div className="message-options-menu absolute top-0 right-0 mt-2 mr-2 bg-white rounded-lg shadow-lg z-10">
      <button onClick={onEdit} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Edit
      </button>
      <button onClick={onDelete} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Delete
      </button>
      <button onClick={onCopy} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Copy
      </button>
    </div>
  )
}

export function FileMessage({ message }) {
  const downloadFile = () => {
    const blob = new Blob([Uint8Array.from(atob(message.fileData), (c) => c.charCodeAt(0))], {
      type: message.fileType,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = message.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const isImage = message.fileType.startsWith("image/")

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
          <button onClick={downloadFile} className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  )
}
