// ─────────────────────────────────────────────────────────────
// StockSense WhatsApp Bot — Express Server Entry Point
// Port 3001 | Sidecar service for WhatsApp messaging
// ─────────────────────────────────────────────────────────────

const express = require('express');
const config = require('./config');
const { initializeClient, sendMessage, getStatus, getQR } = require('./whatsapp-client');

const app = express();

// ── Middleware ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [HTTP] ${req.method} ${req.path}`);
  next();
});

// CORS — allow backend at localhost:8000 (Rule 6 from AGENTS.md)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// ─────────────────────────────────────────────────────────────
// POST /send
// Backend calls this to send a WhatsApp message.
//
// Request:  { "phone": "919876543210", "message": "Hello!" }
// Response: { "success": true, "messageId": "ABC123" }
// ─────────────────────────────────────────────────────────────
app.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: phone, message',
    });
  }

  console.log(`[${new Date().toISOString()}] [SEND] Sending to ${phone}: "${message.substring(0, 80)}..."`);

  const result = await sendMessage(phone, message);

  if (result.success) {
    return res.json({
      success: true,
      messageId: result.messageId,
    });
  }

  return res.status(503).json({
    success: false,
    error: result.error,
  });
});

// ─────────────────────────────────────────────────────────────
// POST /send/template
// Backend calls this to send a templated WhatsApp message.
//
// Request:  { "phone": "919876543210", "template": "stockout_alert", "data": {...} }
// Response: { "success": true, "messageId": "ABC123" }
// ─────────────────────────────────────────────────────────────
app.post('/send/template', async (req, res) => {
  const { phone, template, data } = req.body;

  if (!phone || !template || !data) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: phone, template, data',
    });
  }

  // Dynamically load the template formatter
  const templates = require('./message-templates');

  const templateMap = {
    stockout_alert: templates.formatStockoutAlert,
    low_stock_warning: templates.formatLowStockWarning,
    daily_briefing: templates.formatDailyBriefing,
    weekly_summary: templates.formatWeeklySummary,
    seasonal_warning: templates.formatSeasonalWarning,
    anomaly_alert: templates.formatAnomalyAlert,
  };

  const formatter = templateMap[template];
  if (!formatter) {
    return res.status(400).json({
      success: false,
      error: `Unknown template: "${template}". Available: ${Object.keys(templateMap).join(', ')}`,
    });
  }

  const formattedMessage = formatter(data);
  console.log(`[${new Date().toISOString()}] [SEND/TEMPLATE] Template "${template}" to ${phone}`);

  const result = await sendMessage(phone, formattedMessage);

  if (result.success) {
    return res.json({
      success: true,
      messageId: result.messageId,
    });
  }

  return res.status(503).json({
    success: false,
    error: result.error,
  });
});

// ─────────────────────────────────────────────────────────────
// GET /status
// Check WhatsApp connection status.
//
// Response: { "connected": true, "phone": "919876543210", "uptime": 3600 }
// ─────────────────────────────────────────────────────────────
app.get('/status', (req, res) => {
  const status = getStatus();
  res.json(status);
});

// ─────────────────────────────────────────────────────────────
// GET /qr
// Get QR code data for web display (when not yet connected).
//
// Response: { "qr": "2@ABC123...", "status": "waiting_for_scan" }
// ─────────────────────────────────────────────────────────────
app.get('/qr', (req, res) => {
  const qrData = getQR();
  res.json(qrData);
});

// ─────────────────────────────────────────────────────────────
// GET /health
// Simple health check for orchestrator / load balancer.
// ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    service: 'stocksense-whatsapp-bot',
    status: 'running',
    timestamp: new Date().toISOString(),
    whatsapp: getStatus().connected ? 'connected' : 'disconnected',
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `No route matches ${req.method} ${req.path}`,
    available_routes: [
      'POST /send',
      'POST /send/template',
      'GET  /status',
      'GET  /qr',
      'GET  /health',
    ],
  });
});

// ── Error handler ──
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] [ERROR]`, err.stack || err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ─────────────────────────────────────────────────────────────
// Start server + initialize WhatsApp client
// ─────────────────────────────────────────────────────────────
async function start() {
  // 1. Start Express server
  app.listen(config.PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║       🟢 StockSense WhatsApp Bot — Running         ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║  HTTP API:  http://localhost:${config.PORT}                 ║`);
    console.log(`║  Backend:   ${config.BACKEND_URL}               ║`);
    console.log('║                                                      ║');
    console.log('║  Endpoints:                                          ║');
    console.log('║    POST /send          — Send a message              ║');
    console.log('║    POST /send/template — Send a templated message    ║');
    console.log('║    GET  /status        — Connection status           ║');
    console.log('║    GET  /qr            — QR code for pairing         ║');
    console.log('║    GET  /health        — Health check                ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
  });

  // 2. Initialize WhatsApp client (QR code will appear in terminal)
  console.log('[BOOT] Initializing WhatsApp client...');
  console.log('[BOOT] Scan the QR code below with WhatsApp to connect.');
  console.log('');

  await initializeClient();
}

// ── Launch ──
start().catch((err) => {
  console.error('[FATAL] Failed to start WhatsApp Bot:', err);
  process.exit(1);
});
