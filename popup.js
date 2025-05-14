document.addEventListener('DOMContentLoaded', function() {
  const userId = document.getElementById('userId');
  const connectButton = document.getElementById('connectButton');
  const connectionStatus = document.getElementById('connectionStatus');

  // Load saved user ID if exists
  chrome.storage.sync.get(['userId', 'connected'], function(items) {
    if (items.userId) {
      userId.value = items.userId;
    }
    updateConnectionState(items.connected);
  });

  connectButton.addEventListener('click', function() {
    const id = userId.value.trim();
    
    if (connectButton.textContent === 'Disconnect') {
      // Handle disconnect
      chrome.storage.sync.set({
        connected: false
      }, function() {
        updateConnectionState(false);
      });
      return;
    }

    if (!id) {
      updateConnectionStatus(false, 'Please enter a User ID');
      return;
    }

    // Save user ID and connection status
    chrome.storage.sync.set({
      userId: id,
      connected: true
    }, function() {
      updateConnectionState(true);
    });
  });

  function updateConnectionState(connected) {
    userId.disabled = connected;
    connectButton.textContent = connected ? 'Disconnect' : 'Connect';
    connectButton.className = connected ? 'disconnect' : '';
    updateConnectionStatus(connected);
  }

  function updateConnectionStatus(connected, message) {
    connectionStatus.textContent = message || (connected ? 'Connected' : 'Disconnected');
    connectionStatus.className = `status-message ${connected ? 'connected' : 'disconnected'}`;
  }
});