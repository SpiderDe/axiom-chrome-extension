document.addEventListener('DOMContentLoaded', function() {
  const userId = document.getElementById('userId');
  const connectButton = document.getElementById('connectButton');
  const connectionStatus = document.getElementById('connectionStatus');

  // Load saved user ID if exists
  chrome.storage.sync.get(['userId', 'connected'], function(items) {
    if (items.userId) {
      userId.value = items.userId;
    }
    updateConnectionStatus(items.connected);
  });

  connectButton.addEventListener('click', function() {
    const id = userId.value.trim();
    
    if (!id) {
      updateConnectionStatus(false, 'Please enter a User ID');
      return;
    }

    // Save user ID and connection status
    chrome.storage.sync.set({
      userId: id,
      connected: true
    }, function() {
      updateConnectionStatus(true, 'Connected successfully!');
    });
  });

  function updateConnectionStatus(connected, message) {
    connectionStatus.textContent = message || (connected ? 'Connected' : 'Disconnected');
    connectionStatus.className = `status-message ${connected ? 'connected' : 'disconnected'}`;
  }
});