// ─────────────────────────────────────────────────────────────
// StockSense WhatsApp Bot — Inbound Message Handler
// Parses incoming WhatsApp messages and routes to commands.
// ─────────────────────────────────────────────────────────────

const axios = require('axios');
const config = require('./config');
const { formatHelpMessage } = require('./message-templates');

// Logger helper
function log(level, msg, data = null) {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [MSG-HANDLER] [${level}]`;
  if (data) {
    console.log(`${prefix} ${msg}`, JSON.stringify(data));
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

// ── Recognized commands that get forwarded to the backend webhook ──
const BACKEND_COMMANDS = new Set([
  'REORDER',
  'LIST',
  'REPORT',
  'FULL',
  'STATUS',
  'STOP',
]);

// ── Message queue for when backend is unreachable ──
const messageQueue = [];
let retryTimer = null;

/**
 * Forward a command to the backend webhook.
 * POST http://localhost:8000/api/whatsapp/webhook
 *
 * @param {string} phone  — The sender's phone number
 * @param {string} command — The parsed command
 * @param {string} rawMessage — The original raw message text
 * @returns {Promise<string>} — The reply text from the backend
 */
async function forwardToBackend(phone, command, rawMessage) {
  const url = `${config.BACKEND_URL}${config.WEBHOOK_ENDPOINT}`;

  log('INFO', `Forwarding command to backend`, { phone, command, url });

  try {
    const response = await axios.post(
      url,
      {
        from_number: phone,
        command: command,
        raw_message: rawMessage,
      },
      {
        timeout: 15000, // 15s timeout
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.data && response.data.reply) {
      log('INFO', `Backend replied successfully for command: ${command}`);
      return response.data.reply;
    }

    log('WARN', `Backend response missing "reply" field`, response.data);
    return '⚠️ Received a response from StockSense, but it was empty. Please try again.';
  } catch (error) {
    log('ERROR', `Backend unreachable for command: ${command}`, {
      message: error.message,
      code: error.code,
    });

    // Queue the message for retry
    queueMessage(phone, command, rawMessage);

    return (
      '⏳ StockSense backend is temporarily unavailable.\n' +
      'Your request has been queued and will be processed shortly.'
    );
  }
}

/**
 * Queue a message for retry when backend is unreachable.
 */
function queueMessage(phone, command, rawMessage) {
  if (messageQueue.length >= config.MAX_MESSAGE_QUEUE_SIZE) {
    log('WARN', `Message queue full (${config.MAX_MESSAGE_QUEUE_SIZE}), dropping oldest`);
    messageQueue.shift();
  }

  messageQueue.push({
    phone,
    command,
    rawMessage,
    timestamp: new Date().toISOString(),
    retries: 0,
  });

  log('INFO', `Message queued. Queue size: ${messageQueue.length}`);

  // Start retry timer if not already running
  if (!retryTimer) {
    startRetryTimer();
  }
}

/**
 * Retry sending queued messages every 30 seconds.
 */
function startRetryTimer() {
  retryTimer = setInterval(async () => {
    if (messageQueue.length === 0) {
      clearInterval(retryTimer);
      retryTimer = null;
      log('INFO', 'Message queue empty — retry timer stopped.');
      return;
    }

    log('INFO', `Retrying ${messageQueue.length} queued message(s)...`);

    // Process a copy; we'll remove successes
    const toRetry = [...messageQueue];
    const stillFailed = [];

    for (const item of toRetry) {
      try {
        const url = `${config.BACKEND_URL}${config.WEBHOOK_ENDPOINT}`;
        const response = await axios.post(
          url,
          {
            from_number: item.phone,
            command: item.command,
            raw_message: item.rawMessage,
          },
          { timeout: 10000 }
        );

        if (response.data && response.data.reply) {
          log('INFO', `Retry succeeded for queued command: ${item.command}`);
          // We can't send the reply back here unless we have the WA client
          // The caller should pass a sendReply callback — for now, log it.
        }
      } catch {
        item.retries += 1;
        if (item.retries < 5) {
          stillFailed.push(item);
        } else {
          log('WARN', `Dropping queued message after 5 retries`, item);
        }
      }
    }

    // Replace queue with only failed items
    messageQueue.length = 0;
    messageQueue.push(...stillFailed);

    if (messageQueue.length === 0) {
      clearInterval(retryTimer);
      retryTimer = null;
      log('INFO', 'All queued messages processed — retry timer stopped.');
    }
  }, config.MESSAGE_RETRY_DELAY_MS);
}

/**
 * Handle an incoming WhatsApp message.
 *
 * @param {object} message — whatsapp-web.js Message object
 * @returns {Promise<string>} — The reply text to send back
 */
async function handleIncomingMessage(message) {
  const body = (message.body || '').trim().toUpperCase();
  const phone = message.from; // e.g. "919876543210@c.us"

  log('INFO', `Incoming message`, { from: phone, body: body });

  // ── HELP — handled locally, no backend call ──
  if (body === 'HELP') {
    log('INFO', 'Serving HELP locally');
    return formatHelpMessage();
  }

  // ── Recognized backend commands ──
  if (BACKEND_COMMANDS.has(body)) {
    return await forwardToBackend(phone, body, message.body);
  }

  // ── Unrecognized message ──
  log('INFO', `Unrecognized command: "${body}"`);
  return (
    "🤔 I didn't understand that.\n\n" +
    'Reply *HELP* for a list of available commands.'
  );
}

module.exports = {
  handleIncomingMessage,
  forwardToBackend,
};
