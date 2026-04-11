// ─────────────────────────────────────────────────────────────
// StockSense WhatsApp Bot — WhatsApp Client
// whatsapp-web.js setup with QR pairing and auto-reconnect.
// ─────────────────────────────────────────────────────────────

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const { handleIncomingMessage } = require('./message-handler');

// Logger helper
function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [WA-CLIENT] [${level}]`;
  if (data) {
    console.log(`${prefix} ${msg}`, JSON.stringify(data));
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

// ── State ──
let client = null;
let isReady = false;
let connectedPhone = null;
let startTime = null;
let currentQR = null;
let reconnectAttempts = 0;

/**
 * Initialize and return the WhatsApp client.
 */
function createClient() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: config.AUTH_DATA_PATH }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  // ── QR Code ──
  client.on('qr', (qr) => {
    currentQR = qr;
    log('INFO', 'QR code received — scan with WhatsApp to connect:');
    qrcode.generate(qr, { small: true });
  });

  // ── Ready ──
  client.on('ready', () => {
    isReady = true;
    startTime = Date.now();
    reconnectAttempts = 0;
    currentQR = null;

    const info = client.info;
    connectedPhone = info?.wid?.user || 'unknown';

    log('INFO', `✅ WhatsApp client ready! Connected as: ${connectedPhone}`);
  });

  // ── Authenticated ──
  client.on('authenticated', () => {
    log('INFO', '🔑 Authenticated with saved session.');
    currentQR = null;
  });

  // ── Authentication Failure ──
  client.on('auth_failure', (error) => {
    log('ERROR', '❌ Authentication failed:', { error: error?.message || error });
    isReady = false;
    currentQR = null;
  });

  // ── Disconnected ──
  client.on('disconnected', (reason) => {
    log('WARN', `⚠️ WhatsApp disconnected: ${reason}`);
    isReady = false;
    connectedPhone = null;
    currentQR = null;

    attemptReconnect();
  });

  // ── Incoming Messages ──
  client.on('message', async (message) => {
    // Ignore group messages and status updates
    if (message.isGroupMsg || message.isStatus) return;

    log('INFO', `📩 Message from ${message.from}: "${message.body}"`);

    try {
      const reply = await handleIncomingMessage(message);
      if (reply) {
        await message.reply(reply);
        log('INFO', `📤 Reply sent to ${message.from}`);
      }
    } catch (error) {
      log('ERROR', `Failed to process message`, { error: error.message });
      try {
        await message.reply(
          '❌ Something went wrong processing your request. Please try again.'
        );
      } catch {
        log('ERROR', 'Failed to send error reply');
      }
    }
  });

  // ── Loading Screen ──
  client.on('loading_screen', (percent, message) => {
    log('INFO', `Loading: ${percent}% — ${message}`);
  });

  return client;
}

/**
 * Attempt reconnection with exponential backoff (max 3 retries).
 */
function attemptReconnect() {
  if (reconnectAttempts >= config.MAX_RECONNECT_RETRIES) {
    log('ERROR', `Max reconnection attempts (${config.MAX_RECONNECT_RETRIES}) reached. Manual restart required.`);
    return;
  }

  reconnectAttempts += 1;
  const delay = config.RECONNECT_DELAY_MS * reconnectAttempts; // Simple linear backoff

  log('INFO', `Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${config.MAX_RECONNECT_RETRIES})...`);

  setTimeout(async () => {
    try {
      log('INFO', 'Attempting reconnection...');
      await client.initialize();
    } catch (error) {
      log('ERROR', `Reconnection attempt failed`, { error: error.message });
      attemptReconnect(); // Try again
    }
  }, delay);
}

/**
 * Initialize the WhatsApp client.
 */
async function initializeClient() {
  createClient();
  log('INFO', '🚀 Initializing WhatsApp client...');

  try {
    await client.initialize();
  } catch (error) {
    log('ERROR', `Failed to initialize client: ${error.message}`);
    attemptReconnect();
  }
}

/**
 * Send a message to a phone number.
 *
 * @param {string} phone — Phone number (e.g. "919876543210")
 * @param {string} message — The message text to send
 * @returns {Promise<object>} — { success, messageId } or { success, error }
 */
async function sendMessage(phone, message) {
  if (!isReady || !client) {
    log('WARN', `Cannot send — client not ready`);
    return { success: false, error: 'WhatsApp client is not connected' };
  }

  // Normalize phone — ensure it ends with @c.us
  const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

  try {
    const result = await client.sendMessage(chatId, message);
    log('INFO', `📤 Message sent to ${chatId}`, { messageId: result.id?._serialized });
    return {
      success: true,
      messageId: result.id?._serialized || result.id || 'sent',
    };
  } catch (error) {
    log('ERROR', `Failed to send message to ${chatId}`, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get current connection status.
 */
function getStatus() {
  return {
    connected: isReady,
    phone: connectedPhone,
    uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
    reconnectAttempts,
  };
}

/**
 * Get current QR code data (if waiting for scan).
 */
function getQR() {
  if (isReady) {
    return { qr: null, status: 'connected' };
  }
  if (currentQR) {
    return { qr: currentQR, status: 'waiting_for_scan' };
  }
  return { qr: null, status: 'initializing' };
}

module.exports = {
  initializeClient,
  sendMessage,
  getStatus,
  getQR,
};
