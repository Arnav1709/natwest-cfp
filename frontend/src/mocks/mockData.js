// StockSense — Comprehensive Mock Data
// Realistic Indian pharmacy & retail data

export const mockHealth = {
  total_skus: 156,
  below_reorder: 12,
  stockout_risk: 3,
  out_of_stock: 1,
  forecast_accuracy: 89.2,
  total_inventory_value: 452000,
  health_distribution: { healthy: 122, warning: 22, critical: 12 },
  health_percentages: { healthy: 78, warning: 14, critical: 8 },
};

export const mockProducts = [
  { id: 1,  name: 'Paracetamol 500mg',   category: 'medicines',     unit: 'strips',   current_stock: 45,  reorder_point: 100, safety_stock: 30,  unit_cost: 12.5,  supplier_name: 'Mehta Pharma',        supplier_contact: '+919800000001', lead_time_days: 3, expiry_date: '2027-06-15', status: 'low_stock', days_remaining: 4.5, updated_at: '2026-04-11T10:30:00Z' },
  { id: 2,  name: 'ORS Sachets',          category: 'medicines',     unit: 'packets',  current_stock: 200, reorder_point: 150, safety_stock: 50,  unit_cost: 8.0,   supplier_name: 'Mehta Pharma',        supplier_contact: '+919800000001', lead_time_days: 3, expiry_date: '2027-09-10', status: 'healthy',   days_remaining: 22,  updated_at: '2026-04-11T09:15:00Z' },
  { id: 3,  name: 'Cough Syrup (100ml)',  category: 'medicines',     unit: 'bottles',  current_stock: 120, reorder_point: 80,  safety_stock: 20,  unit_cost: 65.0,  supplier_name: 'Singh Distributors',  supplier_contact: '+919800000002', lead_time_days: 5, expiry_date: '2026-04-18', status: 'healthy',   days_remaining: 18,  updated_at: '2026-04-10T16:00:00Z' },
  { id: 4,  name: 'Bandages (Crepe)',     category: 'supplies',      unit: 'rolls',    current_stock: 30,  reorder_point: 50,  safety_stock: 15,  unit_cost: 25.0,  supplier_name: 'Singh Distributors',  supplier_contact: '+919800000002', lead_time_days: 5, expiry_date: '2028-12-01', status: 'low_stock', days_remaining: 6,   updated_at: '2026-04-11T08:00:00Z' },
  { id: 5,  name: 'Vitamin C Tablets',    category: 'supplements',   unit: 'bottles',  current_stock: 85,  reorder_point: 60,  safety_stock: 20,  unit_cost: 120.0, supplier_name: 'Zydus Healthcare',    supplier_contact: '+919800000003', lead_time_days: 4, expiry_date: '2027-03-20', status: 'healthy',   days_remaining: 28,  updated_at: '2026-04-10T14:30:00Z' },
  { id: 6,  name: 'Amoxicillin 250mg',   category: 'medicines',     unit: 'strips',   current_stock: 10,  reorder_point: 40,  safety_stock: 15,  unit_cost: 35.0,  supplier_name: 'Mehta Pharma',        supplier_contact: '+919800000001', lead_time_days: 3, expiry_date: '2027-01-15', status: 'critical',  days_remaining: 1.5, updated_at: '2026-04-11T11:00:00Z' },
  { id: 7,  name: 'Calamine Lotion',     category: 'medicines',     unit: 'bottles',  current_stock: 60,  reorder_point: 40,  safety_stock: 10,  unit_cost: 45.0,  supplier_name: 'Zydus Healthcare',    supplier_contact: '+919800000003', lead_time_days: 4, expiry_date: '2027-08-01', status: 'healthy',   days_remaining: 15,  updated_at: '2026-04-10T10:00:00Z' },
  { id: 8,  name: 'Digital Thermometer', category: 'equipment',     unit: 'pieces',   current_stock: 15,  reorder_point: 20,  safety_stock: 5,   unit_cost: 250.0, supplier_name: 'MedTech Supplies',    supplier_contact: '+919800000004', lead_time_days: 7, expiry_date: null,         status: 'low_stock', days_remaining: 8,   updated_at: '2026-04-09T16:00:00Z' },
  { id: 9,  name: 'N95 Masks',           category: 'supplies',      unit: 'boxes',    current_stock: 0,   reorder_point: 30,  safety_stock: 10,  unit_cost: 180.0, supplier_name: 'MedTech Supplies',    supplier_contact: '+919800000004', lead_time_days: 7, expiry_date: '2029-01-01', status: 'out_of_stock', days_remaining: 0, updated_at: '2026-04-11T07:00:00Z' },
  { id: 10, name: 'Antiseptic Liquid',   category: 'medicines',     unit: 'bottles',  current_stock: 75,  reorder_point: 50,  safety_stock: 15,  unit_cost: 55.0,  supplier_name: 'Singh Distributors',  supplier_contact: '+919800000002', lead_time_days: 5, expiry_date: '2027-05-01', status: 'healthy',   days_remaining: 20,  updated_at: '2026-04-10T12:00:00Z' },
  { id: 11, name: 'Electrolyte Powder',  category: 'supplements',   unit: 'sachets',  current_stock: 180, reorder_point: 100, safety_stock: 30,  unit_cost: 15.0,  supplier_name: 'Mehta Pharma',        supplier_contact: '+919800000001', lead_time_days: 3, expiry_date: '2027-11-30', status: 'healthy',   days_remaining: 30,  updated_at: '2026-04-11T06:00:00Z' },
  { id: 12, name: 'Eye Drops',           category: 'medicines',     unit: 'bottles',  current_stock: 40,  reorder_point: 35,  safety_stock: 10,  unit_cost: 70.0,  supplier_name: 'Zydus Healthcare',    supplier_contact: '+919800000003', lead_time_days: 4, expiry_date: '2026-08-15', status: 'healthy',   days_remaining: 12,  updated_at: '2026-04-10T08:00:00Z' },
];

export const mockForecast = {
  product_id: 1,
  product_name: 'Paracetamol 500mg',
  forecast: [
    { week: '2026-W16', week_start: '2026-04-13', low: 60,  likely: 85,  high: 120 },
    { week: '2026-W17', week_start: '2026-04-20', low: 55,  likely: 80,  high: 110 },
    { week: '2026-W18', week_start: '2026-04-27', low: 70,  likely: 100, high: 145 },
    { week: '2026-W19', week_start: '2026-05-04', low: 65,  likely: 90,  high: 130 },
    { week: '2026-W20', week_start: '2026-05-11', low: 60,  likely: 85,  high: 120 },
    { week: '2026-W21', week_start: '2026-05-18', low: 58,  likely: 82,  high: 115 },
  ],
  baseline: [75, 75, 75, 75, 75, 75],
  actuals: [78, 82, null, null, null, null],
  anomalies: [{ week: 'W18', value: 155, z_score: 2.8 }],
  drivers: 'Dengue season active (+25%), Monsoon approaching (+10%), Upward sales trend (+8%)',
  driver_details: [
    { icon: '🦟', name: 'Dengue Season', desc: 'High regional infection index affects antiyretics demand.', value: '+25%', positive: true },
    { icon: '🌧️', name: 'Monsoon Patterns', desc: 'Expected rainfall increase correlates with supply lag.', value: '+10%', positive: true },
    { icon: '📈', name: 'Market Up-trend', desc: 'Organic growth in regional pharmacy purchases.', value: '+8%',  positive: true },
  ],
  accuracy: { mape: 11.2, accuracy_pct: 88.8, trend: 'improving' },
};

export const mockAlerts = [
  { id: 1, product_id: 9,  product_name: 'N95 Masks',           type: 'stockout',  severity: 'critical', title: 'OUT OF STOCK: N95 Masks',           message: 'Inventory hit 0. 15 units remaining.', dismissed: false, created_at: '2026-04-11T09:15:00Z' },
  { id: 2, product_id: 1,  product_name: 'Paracetamol 500mg',   type: 'low_stock', severity: 'critical', title: 'Paracetamol stock low',             message: 'Inventory fell below safety threshold (15 units remaining).', dismissed: false, created_at: '2026-04-11T08:30:00Z' },
  { id: 3, product_id: 2,  product_name: 'ORS Sachets',          type: 'anomaly',   severity: 'warning',  title: 'Upcoming monsoon surge',            message: 'Forecast predicts 35% increase in seasonal demand for anti-pyretics.', dismissed: false, created_at: '2026-04-11T07:00:00Z' },
  { id: 4, product_id: 3,  product_name: 'Cough Syrup (100ml)', type: 'expiry',    severity: 'warning',  title: 'Supplier Delay: Zydus Ltd.',        message: 'Shipment #52-492 delayed by 3 days due to logistics bottleneck.', dismissed: false, created_at: '2026-04-10T15:00:00Z' },
  { id: 5, product_id: 5,  product_name: 'Vitamin C Tablets',   type: 'info',      severity: 'info',     title: 'Cold storage fluctuation',          message: 'Fridge unit A2 reported temp rise to 8°C (Threshold 6°C).', dismissed: false, created_at: '2026-04-10T12:00:00Z' },
  { id: 6, product_id: null, product_name: null,                  type: 'info',      severity: 'info',     title: 'Stock Count Verified',              message: 'Nightly reconciliation complete. 98.5% accuracy achieved.', dismissed: false, created_at: '2026-04-10T06:00:00Z' },
  { id: 7, product_id: 6,  product_name: 'Amoxicillin 250mg',   type: 'low_stock', severity: 'critical', title: 'Critical: Amoxicillin stock',       message: 'Only 10 strips remaining. Lead time 3 days.', dismissed: false, created_at: '2026-04-11T11:00:00Z' },
  { id: 8, product_id: 4,  product_name: 'Bandages (Crepe)',     type: 'seasonal',  severity: 'warning',  title: 'Monsoon prep reminder',             message: 'Monsoon season approaching. Stock up on first-aid supplies.', dismissed: false, created_at: '2026-04-10T08:00:00Z' },
];

export const mockReorder = {
  summary: {
    total_items: 8,
    estimated_total_cost: 12450,
    most_urgent_product: 'Paracetamol 500mg',
    most_urgent_days_remaining: 1.5,
  },
  reorder_list: [
    { product_id: 1,  product_name: 'Paracetamol 500mg', current_stock: 45,  forecast_demand: 85,  reorder_qty: 200, days_to_stockout: 4.5, urgency: 'high',   supplier_name: 'Mehta Pharma',       estimated_cost: 2500 },
    { product_id: 6,  product_name: 'Amoxicillin 250mg', current_stock: 10,  forecast_demand: 25,  reorder_qty: 80,  days_to_stockout: 1.5, urgency: 'high',   supplier_name: 'Mehta Pharma',       estimated_cost: 2800 },
    { product_id: 9,  product_name: 'N95 Masks',          current_stock: 0,   forecast_demand: 15,  reorder_qty: 50,  days_to_stockout: 0,   urgency: 'high',   supplier_name: 'MedTech Supplies',   estimated_cost: 9000 },
    { product_id: 4,  product_name: 'Bandages (Crepe)',    current_stock: 30,  forecast_demand: 20,  reorder_qty: 40,  days_to_stockout: 6,   urgency: 'medium', supplier_name: 'Singh Distributors', estimated_cost: 1000 },
    { product_id: 8,  product_name: 'Digital Thermometer',current_stock: 15,  forecast_demand: 8,   reorder_qty: 15,  days_to_stockout: 8,   urgency: 'medium', supplier_name: 'MedTech Supplies',   estimated_cost: 3750 },
    { product_id: 12, product_name: 'Eye Drops',          current_stock: 40,  forecast_demand: 15,  reorder_qty: 25,  days_to_stockout: 12,  urgency: 'low',    supplier_name: 'Zydus Healthcare',   estimated_cost: 1750 },
  ],
  grouped_by_supplier: {
    'Mehta Pharma':       [{ product_id: 1, product_name: 'Paracetamol 500mg', reorder_qty: 200, estimated_cost: 2500 }, { product_id: 6, product_name: 'Amoxicillin 250mg', reorder_qty: 80, estimated_cost: 2800 }],
    'Singh Distributors': [{ product_id: 4, product_name: 'Bandages (Crepe)', reorder_qty: 40, estimated_cost: 1000 }],
    'MedTech Supplies':   [{ product_id: 9, product_name: 'N95 Masks', reorder_qty: 50, estimated_cost: 9000 }, { product_id: 8, product_name: 'Digital Thermometer', reorder_qty: 15, estimated_cost: 3750 }],
    'Zydus Healthcare':   [{ product_id: 12, product_name: 'Eye Drops', reorder_qty: 25, estimated_cost: 1750 }],
  },
};

export const mockScenario = {
  original_forecast: [
    { week: '2026-W16', low: 60,  likely: 85,  high: 120 },
    { week: '2026-W17', low: 55,  likely: 80,  high: 110 },
    { week: '2026-W18', low: 70,  likely: 100, high: 145 },
    { week: '2026-W19', low: 65,  likely: 90,  high: 130 },
    { week: '2026-W20', low: 60,  likely: 85,  high: 120 },
    { week: '2026-W21', low: 58,  likely: 82,  high: 115 },
  ],
  scenario_forecast: [
    { week: '2026-W16', low: 72,  likely: 102, high: 144 },
    { week: '2026-W17', low: 66,  likely: 96,  high: 132 },
    { week: '2026-W18', low: 84,  likely: 120, high: 174 },
    { week: '2026-W19', low: 78,  likely: 108, high: 156 },
    { week: '2026-W20', low: 72,  likely: 102, high: 144 },
    { week: '2026-W21', low: 70,  likely: 98,  high: 138 },
  ],
  delta: [
    { week: '2026-W16', change_pct: 20, additional_units: 17 },
    { week: '2026-W17', change_pct: 20, additional_units: 16 },
    { week: '2026-W18', change_pct: 20, additional_units: 20 },
    { week: '2026-W19', change_pct: 20, additional_units: 18 },
    { week: '2026-W20', change_pct: 20, additional_units: 17 },
    { week: '2026-W21', change_pct: 20, additional_units: 16 },
  ],
  revised_reorder_qty: 240,
  original_reorder_qty: 200,
};

export const mockVerificationData = [
  { id: 1, name: 'Paracetamol 500mg',  date: '2026-03-12', quantity: 50,  price: 12.5,  category: 'medicines',   confidence: 0.95 },
  { id: 2, name: 'ORS Sachets',         date: '2026-03-12', quantity: 30,  price: 8.0,   category: 'medicines',   confidence: 0.92 },
  { id: 3, name: 'Cough Syrup',         date: '2026-03-13', quantity: 25,  price: 65.0,  category: 'medicines',   confidence: 0.88 },
  { id: 4, name: 'Bandage Pack',        date: '2026-03-13', quantity: 15,  price: 25.0,  category: 'supplies',    confidence: 0.65 },
  { id: 5, name: 'Vitamin C',           date: '2026-03-14', quantity: 40,  price: 120.0, category: 'supplements', confidence: 0.91 },
  { id: 6, name: 'Calamine Lotion',     date: '2026-03-14', quantity: 20,  price: 45.0,  category: 'medicines',   confidence: 0.78 },
  { id: 7, name: 'Amoxicillin',         date: '2026-03-15', quantity: 35,  price: 35.0,  category: 'medicines',   confidence: 0.97 },
  { id: 8, name: 'Eye Drops',           date: '2026-03-15', quantity: 18,  price: 70.0,  category: 'medicines',   confidence: 0.85 },
];

export const mockStockMovements = [
  { id: 1, date: '2026-04-11', type: 'sale',       quantity: -10, notes: 'Walk-in customer',        balance: 45 },
  { id: 2, date: '2026-04-10', type: 'sale',       quantity: -15, notes: 'Regular prescription',    balance: 55 },
  { id: 3, date: '2026-04-09', type: 'restock',    quantity: 100, notes: 'Mehta Pharma order #234', balance: 70 },
  { id: 4, date: '2026-04-08', type: 'sale',       quantity: -20, notes: 'Bulk order',              balance: -30 },
  { id: 5, date: '2026-04-07', type: 'sale',       quantity: -8,  notes: 'Walk-in customer',        balance: 50 },
  { id: 6, date: '2026-04-06', type: 'adjustment', quantity: -2,  notes: 'Damaged stock removed',   balance: 58 },
];

export const mockNotificationSettings = {
  stockout_alerts: true,
  low_stock_alerts: true,
  daily_briefing: true,
  daily_briefing_time: '08:00',
  weekly_summary: true,
  weekly_summary_day: 'sunday',
  seasonal_warnings: true,
  seasonal_advance_days: 14,
  anomaly_alerts: true,
  channel_in_app: true,
  channel_whatsapp: true,
  channel_email: false,
};

export const mockHeatmapData = {
  products: ['Paracetamol', 'ORS Sachets', 'Cough Syrup', 'Vitamin C'],
  days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  values: [
    [92, 83, 42, 12, 99, 80, 99],
    [80, 93, 70, 76, 28, 30, 55],
    [95, 84, 100, 86, 83, 45, 78],
    [90, 89, 98, 93, 81, 76, 40],
  ],
};

export const mockIntelligence = [
  { icon: '⚠️', title: 'Paracetamol stock low', message: 'Inventory fell below safety threshold (15 units remaining).', time: '1h ago' },
  { icon: '🌊', title: 'Upcoming monsoon surge', message: 'Forecast predicts 35% increase in seasonal demand for anti-pyretics.', time: '45m ago' },
  { icon: '🚚', title: 'Supplier Delay: Zydus Ltd.', message: 'Shipment #52-492 delayed by 3 days due to logistics bottleneck.', time: '3h ago' },
  { icon: '❄️', title: 'Cold storage fluctuation', message: 'Fridge unit A2 reported temp rise to 8°C (Threshold 6°C).', time: '4h ago' },
  { icon: '✅', title: 'Stock Count Verified', message: 'Nightly reconciliation complete. 98.5% accuracy achieved.', time: '5h ago' },
];

export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];
