// Background script for Axiom Trade Helper extension

// Listen for installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Set default settings on installation
    chrome.storage.sync.set({
      enabled: true,
      buyText: 'DEV SELL',
      buyColor: '#52C5FF',
      sellText: 'LAST SELL',
      sellColor: '#FF5252'
    });
  }
});

// Optional: Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // You can handle any background actions here if needed
  // For example, logging actions or communicating with external services
  
  if (request.action === 'devSell') {
    console.log('DEV SELL action received:', request.tokenInfo);
    // Handle buy action if needed
    
    sendResponse({status: 'success'});
  }
  
  if (request.action === 'lastSell') {
    console.log('LAST SELL action received:', request.tokenInfo);
    // Handle sell action if needed
    
    sendResponse({status: 'success'});
  }
  
  return true; // Keep the message channel open for asynchronous responses
});