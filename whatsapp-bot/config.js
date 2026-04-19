// ─────────────────────────────────────────────────────────────
// SupplySense WhatsApp Bot — Configuration
// ─────────────────────────────────────────────────────────────

module.exports = {
  // Express server port (Rule 5 from AGENTS.md)
  PORT: process.env.WA_PORT || 3001,

  // Python backend base URL (Rule 7 from AGENTS.md)
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',

  // Webhook endpoint on the backend
  WEBHOOK_ENDPOINT: '/api/whatsapp/webhook',

  // Reconnection settings
  MAX_RECONNECT_RETRIES: 3,
  RECONNECT_DELAY_MS: 5000,

  // Message retry settings (when backend is unreachable)
  MESSAGE_RETRY_DELAY_MS: 30000,
  MAX_MESSAGE_QUEUE_SIZE: 100,

  // WhatsApp session data path
  AUTH_DATA_PATH: './.wwebjs_auth',

  // Logging
  LOG_TIMESTAMP_FORMAT: 'yyyy-MM-dd HH:mm:ss',
};
