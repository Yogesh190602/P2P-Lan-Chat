"use client"
import { WifiOff, RefreshCw } from "lucide-react"

export default function ConnectionStatus({ connected, isReconnecting, connectionError, refreshConnection, darkMode }) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${darkMode ? "bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900" : ""}`}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl opacity-20 blur-xl animate-pulse"></div>
        <div
          className={`relative backdrop-blur-xl rounded-3xl p-8 shadow-2xl border transition-all duration-500 text-center ${darkMode ? "bg-gray-800/90 border-gray-700/50" : ""}`}
        >
          <div className="mb-6 relative">
            {isReconnecting ? (
              <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full animate-spin"></div>
                <div className="relative bg-white rounded-full p-3">
                  <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                </div>
              </div>
            ) : (
              <div className="relative inline-flex items-center justify-center w-16 h-16 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full animate-pulse"></div>
                <div className="relative bg-white rounded-full p-3">
                  <WifiOff className="w-8 h-8 text-red-500" />
                </div>
              </div>
            )}
          </div>
          <h2 className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : ""}`}>
            {isReconnecting ? "Reconnecting..." : "Connection Lost"}
          </h2>
          <p className={`mb-6 ${darkMode ? "text-gray-300" : ""}`}>
            {isReconnecting ? "Attempting to reconnect to the network..." : "Unable to connect to the chat network"}
          </p>
          {connectionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-in">
              <span className="text-red-700 text-sm">{connectionError}</span>
            </div>
          )}
          <button
            onClick={refreshConnection}
            className="py-3 px-6 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 focus:scale-105 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl focus:shadow-xl"
          >
            <div className="flex items-center justify-center space-x-2">
              <RefreshCw className="w-5 h-5" />
              <span>{"Retry Connection"}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
