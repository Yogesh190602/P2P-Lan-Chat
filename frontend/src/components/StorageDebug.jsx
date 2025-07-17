import { useState, useEffect } from 'react';
import { getMessageStats, clearAllData } from '../utils/db';
import { Database, Trash2, RefreshCw } from 'lucide-react';

export default function StorageDebug({ darkMode }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const newStats = await getMessageStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all stored messages and data? This cannot be undone.')) {
      try {
        await clearAllData();
        await loadStats();
        alert('All data cleared successfully!');
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data. Check console for details.');
      }
    }
  };

  useEffect(() => {
    if (showDebug) {
      loadStats();
    }
  }, [showDebug]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowDebug(!showDebug)}
        className={`p-2 rounded-full shadow-lg transition-all duration-300 ${
          darkMode 
            ? 'bg-gray-800 text-white hover:bg-gray-700' 
            : 'bg-white text-gray-800 hover:bg-gray-100'
        }`}
        title="Storage Debug"
      >
        <Database className="w-5 h-5" />
      </button>

      {showDebug && (
        <div className={`absolute bottom-12 right-0 p-4 rounded-lg shadow-xl min-w-72 ${
          darkMode 
            ? 'bg-gray-800 text-white border border-gray-700' 
            : 'bg-white text-gray-800 border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Message Storage</h3>
            <button
              onClick={loadStats}
              disabled={loading}
              className={`p-1 rounded hover:bg-gray-100 ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Direct Messages:</span>
              <span className="font-mono">{stats.totalMessages || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Group Messages:</span>
              <span className="font-mono">{stats.totalGroupMessages || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Known Peers:</span>
              <span className="font-mono">{stats.totalPeers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Message:</span>
              <span className="font-mono text-xs">
                {stats.lastMessageTime 
                  ? new Date(stats.lastMessageTime).toLocaleTimeString()
                  : 'None'
                }
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClearData}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              💾 Messages are automatically saved to IndexedDB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
