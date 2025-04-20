// utils/pauseManager.js

const pauseMap = new Map();
const cancelMap = new Map();

module.exports = {
  setPaused: (userId, value) => pauseMap.set(userId, value),
  isPaused: (userId) => pauseMap.get(userId) || false,
  clearPause: (userId) => pauseMap.delete(userId),

  setCancelled: (userId, value) => cancelMap.set(userId, value),
  isCancelled: (userId) => cancelMap.get(userId) || false,
  clearCancel: (userId) => cancelMap.delete(userId),

  clearAll: (userId) => {
    pauseMap.delete(userId);
    cancelMap.delete(userId);
  }
};
