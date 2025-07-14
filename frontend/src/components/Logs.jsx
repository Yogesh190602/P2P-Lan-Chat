import { Settings } from "lucide-react"

export default function SystemLogs({ showLogs, logs, messagesEndRef, darkMode }) {
  if (!showLogs) return null

  return (
    <div className="flex-1 flex flex-col">
      <div className={`p-4 border-b ${darkMode ? "border-gray-700/50" : ""}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h2 className={`text-lg font-semibold ${darkMode ? "text-white" : ""}`}>{"System Logs"}</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {logs.map((log, index) => (
            <div key={index} className={`p-3 rounded-xl ${darkMode ? "bg-gray-700/50" : ""}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${darkMode ? "text-gray-300" : ""}`}>{log.message}</p>
                <span className={`text-xs ${darkMode ? "text-gray-400" : ""}`}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
