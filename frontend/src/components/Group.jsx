"use client"
import { ArrowLeft, Hash, Paperclip, Send, Upload, X, FileText, MessageCircle, Check } from "lucide-react"
import { FileMessage } from "./Chat" // Consolidated import

export function GroupChatWindow({
  activeGroup,
  groupMessages,
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
              className={`p-2 rounded-xl transition-all duration-300 hover:scale-95 ${darkMode ? "hover:bg-gray-700/50" : ""}`}
            >
              <ArrowLeft className="w-5 h-5 text-violet-600" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : ""}`}>{activeGroup.name}</h2>
              <p className={`text-sm ${darkMode ? "text-white" : ""}`}>
                {activeGroup.members.length} {"members"}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${darkMode ? "bg-[#111827]" : ""}`}
        style={{ paddingTop: "80px", paddingBottom: "80px" }}
      >
        {(groupMessages[activeGroup.id] || []).map((message, index) => (
          <div key={index} className={`flex ${message.isOwnMessage ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                message.isOwnMessage
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                  : darkMode
                    ? "bg-gray-700 text-white"
                    : ""
              }`}
            >
              {!message.isOwnMessage && (
                <p className={`text-xs font-semibold mb-1 ${darkMode ? "text-gray-300" : ""}`}>{message.from}</p>
              )}
              {message.isFile ? <FileMessage message={message} /> : <p className="text-sm">{message.content}</p>}
              <p className={`text-xs mt-1 ${message.isOwnMessage ? "text-white/70" : darkMode ? "text-gray-400" : ""}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={`p-4 border-t sticky bottom-0 w-full z-20 ${darkMode ? "border-gray-700/50 bg-gray-800" : ""}`}>
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
            className={`p-3 rounded-xl transition-all duration-300 hover:scale-105 ${
              darkMode ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:scale-105 text-gray-300" : ""
            }`}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}utilities
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

export function CreateGroupModal({
  showCreateGroup,
  cancelCreateGroup,
  groupName,
  setGroupName,
  connectedPeers,
  togglePeerSelection,
  selectedPeers,
  createGroup,
  isCreatingGroup,
  darkMode,
}) {
  if (!showCreateGroup) return null

  return (
    <div className="flex-1 flex flex-col">
      <div className={`p-4 border-b ${darkMode ? "border-gray-700/50" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : ""}`}>{"Create Group"}</h2>
          <button
            onClick={cancelCreateGroup}
            className={`p-2 rounded-xl transition-all duration-300 hover:scale-95 ${darkMode ? "hover:bg-gray-700/50" : ""}`}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-6">
        <div>
          <label className={`block text-sm font-semibold mb-3 ${darkMode ? "text-gray-300" : ""}`}>
            {"Group Name"}
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className={`w-full px-4 py-3 rounded-2xl transition-all duration-300 focus:scale-95 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
              darkMode ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400" : ""
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-3 ${darkMode ? "text-gray-300" : ""}`}>
            {"Select Members"}
          </label>
          <div className="space-y-2">
            {connectedPeers.map((peer) => (
              <button
                key={peer.id}
                onClick={() => togglePeerSelection(peer)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 hover:scale-95 ${
                  selectedPeers.some((p) => p.id === peer.id)
                    ? "bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg"
                    : darkMode
                      ? "bg-gray-700/50 text-white hover:bg-gray-600/50"
                      : ""
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">{peer.name}</span>
                </div>
                {selectedPeers.some((p) => p.id === peer.id) && <Check className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={createGroup}
          disabled={!groupName.trim() || selectedPeers.length === 0 || isCreatingGroup}
          className="w-full py-3 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl"
        >
          {isCreatingGroup ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  )
}
