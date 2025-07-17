"use client"
import { Users, MessageCircle, Plus, Search, Settings, LogOut, Hash } from "lucide-react"

export default function Sidebar({
  name,
  connected,
  darkMode,
  searchTerm,
  setSearchTerm,
  filteredPeers,
  openChat,
  activeChat,
  filteredGroups,
  openGroup,
  activeGroup,
  setShowCreateGroup,
  toggleLogs,
  showLogs,
  handleQuit,
}) {
  return (
    <div
      className={`w-80 transition-all duration-500 flex flex-col border-r fixed left-0 top-0 h-screen z-10 ${darkMode ? "bg-gray-800 border-gray-700/50" : ""}`}
    >
      <div className="p-6 border-b border-gray-200/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white animate-pulse ${connected ? "bg-green-500" : "bg-red-500"}`}
              ></div>
            </div>
            <div>
              <h1 className={`text-lg font-bold ${darkMode ? "text-white" : ""}`}>{name}</h1>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"} ${connected ? "animate-pulse" : ""}`}
                ></div>
                <p className={`text-sm ${darkMode ? "text-gray-300" : ""}`}>{connected ? "Online" : "Offline"}</p>
              </div>
            </div>
          </div>
          {/* Removed dark mode toggle button */}
        </div>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center transition-all duration-300 group-focus-within:scale-110">
              <Search className="w-4 h-4 text-white" />
            </div>
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-14 pr-4 py-3 rounded-2xl transition-all duration-300 focus:scale-105 focus:shadow-lg border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
              darkMode ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400" : ""
            }`}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? "text-gray-400" : ""}`}>
              {"Direct Messages"}
            </h3>
            <span className={`text-xs px-3 py-1 rounded-full ${darkMode ? "bg-gray-700 text-gray-300" : ""}`}>
              {filteredPeers.length}
            </span>
          </div>
          {filteredPeers.map((peer) => (
            <button
              key={peer.deviceId}
              onClick={() => openChat(peer)}
              className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg group ${
                activeChat?.deviceId === peer.deviceId
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : darkMode
                    ? "hover:bg-gray-700/50"
                    : ""
              }`}
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    activeChat?.deviceId === peer.deviceId ? "bg-white/20" : "bg-gradient-to-r from-violet-500 to-purple-500"
                  }`}
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  peer.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}></div>
              </div>
              <div className="flex-1 text-left">
                <p className={`font-semibold text-sm ${darkMode && activeChat?.deviceId !== peer.deviceId ? "text-white" : ""}`}>
                  {peer.name}
                </p>
                <p
                  className={`text-xs transition-all duration-300 ${
                    activeChat?.deviceId === peer.deviceId ? "text-white/70" : darkMode ? "text-gray-400" : ""
                  }`}
                >
                  {peer.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-semibold uppercase tracking-wider ${darkMode ? "text-gray-400" : ""}`}>
              {"Group Chats"}
            </h3>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-3 py-1 rounded-full ${darkMode ? "bg-gray-700 text-gray-300" : ""}`}>
                {filteredGroups.length}
              </span>
              <button
                onClick={() => setShowCreateGroup(true)}
                className={`p-2 rounded-xl transition-all duration-300 hover:scale-110 ${darkMode ? "bg-gray-700/50 hover:bg-gray-600/50" : ""}`}
              >
                <Plus className="w-4 h-4 text-violet-600" />
              </button>
            </div>
          </div>
          {filteredGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => openGroup(group)}
              className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-lg group ${
                activeGroup?.id === group.id
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                  : darkMode
                    ? "hover:bg-gray-700/50"
                    : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  activeGroup?.id === group.id ? "bg-white/20" : "bg-gradient-to-r from-violet-500 to-purple-500"
                }`}
              >
                <Hash className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{group.name}</p>
                <p
                  className={`text-xs transition-all duration-300 ${
                    activeGroup?.id === group.id ? "text-white/70" : darkMode ? "text-gray-400" : ""
                  }`}
                >
                  {group.members.length} {"members"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-200/20">
        <div className="flex space-x-2 h-16 items-center">
          <button
            onClick={toggleLogs}
            className={`flex-1 py-3 px-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 ${
              showLogs
                ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                : "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="text-sm">{"System"}</span>
            </div>
          </button>
          <button
            onClick={handleQuit}
            className={`py-3 px-4 rounded-2xl transition-all duration-300 hover:scale-110 ${
              darkMode ? "bg-gray-700/50 hover:bg-red-600/50 text-gray-300 hover:text-white" : ""
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
