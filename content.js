const server = 'https://axiomrxmz.info';

// Initialize default settings and WebSocket
let settings = {
  userId: '',
  connected: false
};

let socket = null;
let tokenDataMap = new Map();

// Helper function to abbreviate addresses
function abbreviateAddress(address) {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Load saved settings
chrome.storage.sync.get(['userId', 'connected'], function (items) {
  settings = items;
  if (settings.connected) {
    initializeWebSocket();
    initializeButtons();
  }
});

// Listen for settings changes
chrome.storage.onChanged.addListener(function (changes) {
  if (changes.connected) {
    console.log('connection status changed');
    settings.connected = changes.connected.newValue;
    if (settings.connected) {
      initializeWebSocket();
      initializeButtons();
    } else {
      if (socket) {
        socket.close();
        socket = null;
      }
      removeAllButtons();
    }
  }
  if (changes.userId) {
    console.log('userId changed');
    settings.userId = changes.userId.newValue;
  }
});

// Initialize WebSocket connection
function initializeWebSocket() {

  console.log('initializeWebSocket');

  if (socket) {
    console.log('force close websocket');
    socket.close();
    socket = null;
  }

  socket = new WebSocket('wss://cluster5.axiom.trade/?');

  socket.addEventListener('open', () => {
    console.log('WebSocket connection established');
    socket.send(JSON.stringify({ "action": "join", "room": "new_pairs" }));
  });

  socket.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.content) {
        const tokenInfo = {
          address: data.content.token_address,
          // pairAddress: data.content.pair_address,
          name: data.content.token_name,
          symbol: data.content.token_ticker,
          // decimals: data.content.token_decimals,
          // protocol: data.content.protocol,
          // initialLiquiditySol: data.content.initial_liquidity_sol,
          // initialLiquidityToken: data.content.initial_liquidity_token,
          // supply: data.content.supply,
          // lpBurned: data.content.lp_burned,
          // createdAt: data.content.created_at,
          // openTrading: data.content.open_trading,
          deployerAddress: data.content.deployer_address
        };
        tokenDataMap.set(abbreviateAddress(data.content.token_address), tokenInfo);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  socket.addEventListener('close', () => {
    console.log('WebSocket connection closed');
    setTimeout(initializeWebSocket, 5000);
  });

  socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

// Remove all buttons
function removeAllButtons() {
  document.querySelectorAll('.axiom-helper-button-container, .axiom-helper-trading-buttons').forEach(el => el.remove());
}

// Initialize buttons for all matching elements
function initializeButtons() {
  if (!settings.connected) return;
  createButtonsForExistingElements();
  createTradingPageButtons();
  observeDOMChanges();
}

// Create buttons for existing elements
function createButtonsForExistingElements() {
  const newPairsHeader = Array.from(document.querySelectorAll('span.text-textPrimary.text-\\[16px\\].font-medium'))
    .find(el => el.textContent === 'New Pairs');

  if (!newPairsHeader) return;

  const newPairsSection = newPairsHeader.closest('.flex.flex-1.flex-col');
  if (!newPairsSection) return;

  const tokenElements = newPairsSection.querySelectorAll('.flex.flex-row.w-full.gap-\\[12px\\].pl-\\[12px\\].pr-\\[12px\\]');

  tokenElements.forEach(element => {
    if (!settings.connected) return;
    addButtonsToElement(element);
  });
}

// Create buttons for trading page
function createTradingPageButtons() {
  if (!settings.connected) return;

  const tradingPageContainer = document.querySelector('.flex.flex-row.flex-1.max-h-\\[64px\\].min-h-\\[64px\\].border-b.border-primaryStroke');
  if (!tradingPageContainer || tradingPageContainer.querySelector('.axiom-helper-trading-buttons')) return;

  const tradingButtonsContainer = document.createElement('div');
  tradingButtonsContainer.className = 'axiom-helper-trading-buttons flex flex-row gap-[8px] items-center ml-auto';

  const devSellButton = document.createElement('button');
  devSellButton.className = 'axiom-helper-button axiom-helper-buy text-[14px] px-4';
  devSellButton.textContent = 'DEV SELL';

  const lastSellButton = document.createElement('button');
  lastSellButton.className = 'axiom-helper-button axiom-helper-sell text-[14px] px-4';
  lastSellButton.textContent = 'LAST SELL';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'axiom-helper-button text-[14px] px-4';
  cancelButton.style.backgroundColor = '#ff0000';
  cancelButton.textContent = 'CANCEL';

  const tokenPairAddress = window.location.pathname.split('/').pop();

  devSellButton.addEventListener('click', (e) => handleTradingButtonClick(e, 'devSell', tokenPairAddress));
  lastSellButton.addEventListener('click', (e) => handleTradingButtonClick(e, 'lastSell', tokenPairAddress));
  cancelButton.addEventListener('click', (e) => handleTradingButtonClick(e, 'cancel', tokenPairAddress));

  tradingButtonsContainer.appendChild(devSellButton);
  tradingButtonsContainer.appendChild(lastSellButton);
  tradingButtonsContainer.appendChild(cancelButton);

  const lastButtonGroup = tradingPageContainer.querySelector('.flex.flex-row.flex-1.gap-\\[12px\\].justify-end');
  if (lastButtonGroup) {
    lastButtonGroup.insertBefore(tradingButtonsContainer, lastButtonGroup.firstChild);
  } else {
    tradingPageContainer.appendChild(tradingButtonsContainer);
  }
}

// Handle trading page button clicks
async function handleTradingButtonClick(event, action, tokenPairAddress) {

  console.log('handleTradingButtonClick, tokenPairAddress: ', tokenPairAddress);

  const button = event.currentTarget;
  button.classList.add('axiom-helper-button-pulse');

  try {
    // Step 1: Fetch token info
    const tokenInfoRes = await fetch(`https://api10.axiom.trade/pair-info?pairAddress=${tokenPairAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://axiom.trade',
        'Referer': 'https://axiom.trade/',
      },
      credentials: 'include',
    });

    if (!tokenInfoRes.ok) {
      throw new Error(`Token info request failed: HTTP ${tokenInfoRes.status}`);
    }

    const data = await tokenInfoRes.json();
    console.log('Fetched token info:', data);

    // Validate required fields
    if (!data.tokenAddress || !data.deployerAddress) {
      throw new Error('Invalid token data: tokenAddress or deployerAddress missing.');
    }

    // Step 2: Send to backend
    const backendRes = await fetch(`${server}/order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: settings?.userId,
        tokenAddress: data.tokenAddress,
        devAddress: data.deployerAddress,
        tokenSymbol: data.tokenTicker,
        tokenName: data.tokenName,
        orderType: action
      })
    });

    const backendData = await backendRes.json();
    console.log('Backend response:', backendData);

  } catch (error) {
    console.error('Error in trading button flow:', error.message || error);
  } finally {
    // Always remove the animation
    setTimeout(() => {
      button.classList.remove('axiom-helper-button-pulse');
    }, 400);
  }
}

// Add buttons to a single element
function addButtonsToElement(element) {
  if (!settings.connected || element.querySelector('.axiom-helper-button-container')) {
    return;
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'axiom-helper-button-container';

  const devSellButton = document.createElement('button');
  devSellButton.className = 'axiom-helper-button axiom-helper-buy';
  devSellButton.textContent = 'DEV SELL';

  const lastSellButton = document.createElement('button');
  lastSellButton.className = 'axiom-helper-button axiom-helper-sell';
  lastSellButton.textContent = 'LAST SELL';

  devSellButton.addEventListener('click', (e) => handleButtonClick(e, 'devSell', element));
  lastSellButton.addEventListener('click', (e) => handleButtonClick(e, 'lastSell', element));

  buttonContainer.appendChild(devSellButton);
  buttonContainer.appendChild(lastSellButton);

  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }

  element.appendChild(buttonContainer);
}

// Handle button clicks
function handleButtonClick(event, action, element) {

  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  button.classList.add('axiom-helper-button-pulse');

  const tokenInfo = extractTokenInfo(element);
  const completeTokenInfo = tokenInfo.address ?
    tokenDataMap.get(tokenInfo.address) : null;

  const finalTokenInfo = {
    ...completeTokenInfo,
    action,
    timestamp: new Date().toISOString()
  };

  // console.log('finalTokenInfo: ', finalTokenInfo);
  const sendData = {
    userId: settings.userId,
    tokenAddress: finalTokenInfo.address,
    devAddress: finalTokenInfo.deployerAddress,
    tokenSymbol: finalTokenInfo.symbol,
    tokenName: finalTokenInfo.name,
    orderType: action
  }

  console.log('sendData: ', sendData);

  // Send to backend
  fetch(`${server}/order/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sendData)
  })
    .then(response => response.json())
    .then(data => {
      console.log('Backend response:', data);
    })
    .catch(error => {
      console.error('Error sending to backend:', error);
    });

  setTimeout(() => {
    button.classList.remove('axiom-helper-button-pulse');
  }, 400);
}

// Extract token information including address
function extractTokenInfo(element) {
  if (!element) return { name: 'Unknown', symbol: 'Unknown', address: null };

  const addressButton = element.querySelector('button.text-textTertiary span');
  const address = addressButton ? addressButton.textContent.trim() : null;

  const nameElement = element.querySelector('.text-\\[16px\\].font-medium.tracking-\\[-0\\.02em\\].truncate');
  const fullNameElement = element.querySelector('.text-inherit.text-\\[16px\\]');

  const symbol = nameElement ? nameElement.textContent.trim() : 'Unknown';
  const name = fullNameElement ? fullNameElement.textContent.trim() : 'Unknown';

  return {
    symbol,
    name,
    address: address
  };
}

// Set up MutationObserver to handle dynamically added content
function observeDOMChanges() {
  const targetNode = document.body;

  const observer = new MutationObserver(function (mutations) {
    let shouldCheckForNewElements = false;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldCheckForNewElements = true;
      }
    });

    if (shouldCheckForNewElements && settings.connected) {
      createButtonsForExistingElements();
      createTradingPageButtons();
    }
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
}