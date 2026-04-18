// ─────────────────────────────────────────────────────────────
// StockSense WhatsApp Bot — Message Templates
// All outbound message formatters per PRD §8.4
// ─────────────────────────────────────────────────────────────

/**
 * 🔴 Stockout Alert (Immediate)
 * Sent when a product hits zero stock.
 */
function formatStockoutAlert({
  product_name,
  last_qty,
  intelligence_note = '',
  reorder_qty,
  supplier_name,
  supplier_contact,
}) {
  let msg = `🚨 *StockSense Alert*\n\n`;
  msg += `*${product_name}* is OUT OF STOCK.\n\n`;
  msg += `Your last ${last_qty} units were sold today.\n`;
  if (intelligence_note) {
    msg += `${intelligence_note}\n`;
  }
  msg += `\n📦 Suggested reorder: *${reorder_qty} units*\n`;
  msg += `🏪 Supplier: ${supplier_name} — ${supplier_contact}\n\n`;
  msg += `Reply *REORDER* to generate order slip.`;
  return msg;
}

/**
 * ⚠️ Low Stock Warning (Immediate)
 * Sent when stock drops below reorder point.
 */
function formatLowStockWarning({
  product_name,
  current_stock,
  unit = 'units',
  reorder_point,
  days_remaining,
  reorder_qty,
}) {
  let msg = `⚠️ *StockSense Alert*\n\n`;
  msg += `*${product_name}* is running low.\n\n`;
  msg += `Current stock: ${current_stock} ${unit}\n`;
  msg += `Reorder point: ${reorder_point} ${unit}\n`;
  msg += `Days remaining: ~${days_remaining}\n\n`;
  msg += `📦 Suggested reorder: *${reorder_qty} units*`;
  return msg;
}

/**
 * 🌅 Daily Briefing (8 AM)
 * Morning summary of inventory health + intelligence.
 */
function formatDailyBriefing({
  date,
  healthy_count,
  warning_count,
  critical_count,
  intelligence_items = '',
  top_action = '',
}) {
  let msg = `🌅 *Good Morning — StockSense Daily Brief*\n`;
  msg += `📅 ${date}\n\n`;
  msg += `*Today's Stock Health*\n`;
  msg += `✅ ${healthy_count} products — Good\n`;
  msg += `🟡 ${warning_count} products — Low stock\n`;
  msg += `🔴 ${critical_count} products — Critical\n\n`;
  if (intelligence_items) {
    msg += `*Today's Intelligence*\n`;
    msg += `${intelligence_items}\n\n`;
  }
  if (top_action) {
    msg += `*Top Action*\n`;
    msg += `${top_action}\n\n`;
  }
  msg += `Reply *REPORT* for full details.`;
  return msg;
}

/**
 * 📊 Weekly Summary (Sunday 7 PM)
 * Performance + top movers + next week watch.
 */
function formatWeeklySummary({
  week_range,
  accuracy,
  prevented,
  saved,
  top_movers = '',
  next_week_warnings = '',
}) {
  let msg = `📊 *StockSense Weekly Summary*\n`;
  msg += `Week of ${week_range}\n\n`;
  msg += `*Performance*\n`;
  msg += `📈 Forecast accuracy: ${accuracy}%\n`;
  msg += `✅ Stockouts prevented: ${prevented}\n`;
  msg += `💰 Estimated revenue saved: ₹${saved}\n\n`;
  if (top_movers) {
    msg += `*Top Movers*\n`;
    msg += `${top_movers}\n\n`;
  }
  if (next_week_warnings) {
    msg += `*Next Week Watch*\n`;
    msg += `${next_week_warnings}\n\n`;
  }
  msg += `Reply *FULL* for detailed report.`;
  return msg;
}

/**
 * 🦟 Seasonal Warning (14 days before)
 * Disease intelligence for pharmacy users.
 */
function formatSeasonalWarning({
  disease_name,
  months,
  boost_pct,
  medicine_list,
  peak_week,
}) {
  let msg = `🦟 *Seasonal Health Alert*\n\n`;
  msg += `${disease_name} season is approaching in your region (${months}).\n\n`;
  msg += `Consider stocking ${boost_pct}% more of:\n`;
  msg += `${medicine_list}\n\n`;
  msg += `Based on last year's data, demand typically spikes in week ${peak_week}.`;
  return msg;
}

/**
 * 📈 Anomaly Spike Alert
 * Unusual demand pattern detected.
 */
function formatAnomalyAlert({
  product_name,
  multiplier,
  z_score,
  explanation = '',
  current_stock,
  days_remaining,
  reorder_qty,
}) {
  let msg = `📈 *Unusual Demand Detected*\n\n`;
  msg += `*${product_name}* demand is ${multiplier}× normal this week.\n`;
  msg += `Z-score: ${z_score}\n`;
  if (explanation) {
    msg += `Possible cause: ${explanation}\n\n`;
  }
  msg += `Current stock: ${current_stock} → will last ~${days_remaining} days at this rate.\n\n`;
  msg += `📦 Consider emergency reorder of ${reorder_qty} units.`;
  return msg;
}

/**
 * 📋 Help text — sent locally without backend call.
 */
function formatHelpMessage() {
  let msg = `📋 *StockSense — Available Commands*\n\n`;
  msg += `*REORDER* — Get your AI-generated reorder list\n`;
  msg += `*LIST* — View current inventory status\n`;
  msg += `*REPORT* — Get today's forecast report\n`;
  msg += `*FULL* — Get detailed weekly report\n`;
  msg += `*STATUS* — Quick stock health summary\n`;
  msg += `*STOP* — Pause all notifications\n`;
  msg += `*START* — Resume notifications\n`;
  msg += `*HELP* — Show this help message\n\n`;
  msg += `Just type any command above to get started! 🚀`;
  return msg;
}

/**
 * Generic text message wrapper (used by backend /send API).
 */
function formatGenericMessage(text) {
  return text;
}

module.exports = {
  formatStockoutAlert,
  formatLowStockWarning,
  formatDailyBriefing,
  formatWeeklySummary,
  formatSeasonalWarning,
  formatAnomalyAlert,
  formatHelpMessage,
  formatGenericMessage,
};
