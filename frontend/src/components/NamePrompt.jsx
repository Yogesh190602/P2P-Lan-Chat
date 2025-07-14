"use client"
import { MessageCircle, Star, Zap, WifiOff } from "lucide-react"
import { useEffect } from "react"

// Function to generate a unique device ID
const generateDeviceId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function NamePrompt({ name, setName, handleNameSubmit, connectionError, darkMode }) {
  useEffect(() => {
    // Try to get existing name and device ID from local storage
    const storedName = localStorage.getItem('userName');
    let deviceId = localStorage.getItem('deviceId');
    
    // If no device ID exists, generate one and store it
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }
    
    // If there's a stored name, set it
    if (storedName) {
      setName(storedName);
    }
  }, [setName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Store the name in local storage
    localStorage.setItem('userName', name);
    // Call the original submit handler
    handleNameSubmit(e);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-all duration-700 ${darkMode ? "bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900" : ""}`}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl opacity-20 blur-xl animate-pulse"></div>
        <div
          className={`relative backdrop-blur-xl rounded-3xl p-8 shadow-2xl border transition-all duration-500 max-w-md w-full ${darkMode ? "bg-gray-800/90 border-gray-700/50" : ""}`}
        >
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl rotate-6 animate-spin-slow"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl -rotate-6 animate-spin-slow animation-delay-1000"></div>
              <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1
              className={`text-4xl font-bold mb-2 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent`}
            >
              {"Thenians Chat"}
            </h1>
            <p className={`text-lg ${darkMode ? "text-gray-300" : ""}`}>{"Connect with your peers"}</p>
          </div>
          {connectionError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 animate-slide-in">
              <WifiOff className="w-5 h-5 text-red-500" />
              <span className="text-red-700 text-sm">{connectionError}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={`block text-sm font-semibold mb-3 ${darkMode ? "text-gray-300" : ""}`}>
                {"Enter your name"}
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-6 py-4 rounded-2xl text-lg transition-all duration-300 focus:scale-105 focus:shadow-xl border-2 focus:border-transparent focus:ring-4 focus:ring-violet-500/20 ${
                    darkMode ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-400" : ""
                  }`}
                  placeholder="Your display name"
                  required
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-focus-within:scale-110">
                  <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 focus:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg hover:shadow-xl focus:shadow-xl hover:from-violet-700 hover:to-purple-700"
            >
              <div className="flex items-center justify-center space-x-2">
                <span>{"Enter Chat"}</span>
                <Zap className="w-5 h-5" />
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
