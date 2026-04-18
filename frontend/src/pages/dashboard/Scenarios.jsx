import { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, AlertTriangle, TrendingUp, TrendingDown, ArrowRight, Activity, Percent, Clock, Zap } from 'lucide-react';
import Plot from '../../components/PlotChart.jsx';
import { useApi } from '../../hooks/useApi';
import { inventoryApi, forecastApi } from '../../services/api';
import GlowCard from '../../components/GlowCard';
import AnimatedCounter from '../../components/AnimatedCounter';
import ShimmerButton from '../../components/ShimmerButton';

// Scenario type definitions
const SCENARIO_TYPES = [
  { id: 'discount', label: 'Discount', icon: Percent, desc: 'Price reduction impact' },
  { id: 'surge', label: 'Demand Surge', icon: TrendingUp, desc: 'Growth percentage' },
  { id: 'delay', label: 'Supplier Delay', icon: Clock, desc: 'Additional lead time' },
  { id: 'custom', label: 'Custom', icon: Zap, desc: 'Custom multiplier' },
];

const SLIDER_CONFIG = {
  discount: { label: 'Discount Intensity', min: 5, max: 50, step: 5, unit: '%', default: 20 },
  surge:    { label: 'Demand Surge',       min: 5, max: 100, step: 5, unit: '%', default: 20 },
  delay:    { label: 'Delay Time',         min: 1, max: 30,  step: 1, unit: ' days', default: 3 },
  custom:   { label: 'Custom Multiplier',  min: 5, max: 100, step: 5, unit: '%', default: 20 },
};

const SCENARIO_BADGES = {
  discount: { label: 'Price Impact', color: '#10B981' },
  surge:    { label: 'Projected Surge', color: '#3B82F6' },
  delay:    { label: 'Supply Risk', color: '#EF4444' },
  custom:   { label: 'Custom Simulation', color: '#8B5CF6' },
};

export default function Scenarios() {
  const { data: rawProducts, loading: pLoading } = useApi(() => inventoryApi.list(), []);
  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || []);

  const [productId, setProductId] = useState('');
  const [scenarioType, setScenarioType] = useState('discount');
  const [intensity, setIntensity] = useState(20);
  const [applied, setApplied] = useState(false);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState(null);

  const [appliedIntensity, setAppliedIntensity] = useState(20);
  const [appliedType, setAppliedType] = useState('discount');

  useEffect(() => {
    if (products.length > 0 && !productId) {
      setProductId(products[0].id.toString());
    }
  }, [products, productId]);

  const fetchScenario = useCallback(async (pId, type, val) => {
    if (!pId) return;
    setScenarioLoading(true);
    setScenarioError(null);
    try {
      const res = await forecastApi.scenario({
        product_id: parseInt(pId, 10),
        scenario_type: type,
        value: val,
      });
      setScenarioResult(res);
      setApplied(true);
      setAppliedIntensity(val);
      setAppliedType(type);
    } catch (e) {
      console.error('Failed to run scenario', e);
      setScenarioError(e.message || 'Scenario simulation failed');
    } finally {
      setScenarioLoading(false);
    }
  }, []);

  useEffect(() => {
    if (productId) {
      const sliderCfg = SLIDER_CONFIG[scenarioType] || SLIDER_CONFIG.discount;
      fetchScenario(productId, scenarioType, sliderCfg.default);
    }
  }, [productId, fetchScenario]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = () => {
    fetchScenario(productId, scenarioType, intensity);
  };

  const handleReset = () => {
    setScenarioType('discount');
    setIntensity(SLIDER_CONFIG.discount.default);
    setAppliedType('discount');
    setAppliedIntensity(SLIDER_CONFIG.discount.default);
    fetchScenario(productId, 'discount', SLIDER_CONFIG.discount.default);
  };

  const originalStats = scenarioResult?.original_forecast || [];
  const scenarioStats = scenarioResult?.scenario_forecast || [];
  const weeks = originalStats.map((f) => f.week);
  const origLikely = originalStats.map((f) => f.likely);
  const scenLikely = scenarioStats.map((f) => f.likely);

  const selectedProduct = products.find((p) => p.id.toString() === productId) || {};

  const extraDemand = scenarioResult
    ? Math.round(scenarioResult.revised_reorder_qty - scenarioResult.original_reorder_qty)
    : 0;
  const unitCost = selectedProduct.unit_cost || 0;
  const extraCost = unitCost * Math.max(0, extraDemand);

  const sliderCfg = SLIDER_CONFIG[scenarioType] || SLIDER_CONFIG.discount;
  const appliedSliderCfg = SLIDER_CONFIG[appliedType] || SLIDER_CONFIG.discount;

  const marginImpact = (() => {
    if (appliedType === 'discount') return -(appliedIntensity / 4).toFixed(1);
    if (appliedType === 'surge' || appliedType === 'custom') return '+' + (appliedIntensity / 10).toFixed(1);
    if (appliedType === 'delay') return -(appliedIntensity * 0.5).toFixed(1);
    return '0.0';
  })();
  const marginNegative = appliedType === 'discount' || appliedType === 'delay';

  const depletionRate = scenarioResult && scenarioResult.original_reorder_qty > 0
    ? (scenarioResult.revised_reorder_qty / scenarioResult.original_reorder_qty).toFixed(1)
    : '1.0';

  const revenueEstimate = (scenarioResult?.revised_reorder_qty || 0) * unitCost;

  const currentBadge = (() => {
    if (!originalStats.length) return { label: '—', color: '#94A3B8' };
    const first = origLikely[0] || 0;
    const last = origLikely[origLikely.length - 1] || 0;
    if (last > first * 1.05) return { label: 'Rising', color: '#10B981', icon: TrendingUp };
    if (last < first * 0.95) return { label: 'Declining', color: '#EF4444', icon: TrendingDown };
    return { label: 'Steady', color: '#3B82F6', icon: Activity };
  })();

  const scenarioBadge = SCENARIO_BADGES[appliedType] || SCENARIO_BADGES.custom;

  const smartAlertText = (() => {
    const name = selectedProduct.name || 'this product';
    if (appliedType === 'discount') {
      return `A ${appliedIntensity}% discount on ${name} is projected to increase demand by ~${appliedIntensity}%. Ensure sufficient stock to avoid sell-through before replenishment.`;
    }
    if (appliedType === 'surge') {
      return `A ${appliedIntensity}% demand surge for ${name} would require additional safety stock. Consider pre-ordering from suppliers to avoid stockouts.`;
    }
    if (appliedType === 'delay') {
      return `A ${appliedIntensity}-day supplier delay for ${name} means existing stock must cover ${appliedIntensity} extra days. Review lead-time buffers and alternative suppliers.`;
    }
    return `Custom ${appliedIntensity}% adjustment applied to ${name}. Review the projected impact on stock levels and reorder timing.`;
  })();

  if (pLoading && products.length === 0) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Loading Scenario Planner...</p>
        </div>
      </div>
    );
  }

  const chartConfig = { displayModeBar: false, responsive: true };
  const sharedLayout = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: '#94A3B8', family: "'Inter', sans-serif", size: 11 },
    margin: { t: 20, r: 20, b: 40, l: 40 },
    height: 250,
    xaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.05)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zerolinecolor: 'rgba(255,255,255,0.05)', title: 'Units' },
    showlegend: false,
    hovermode: 'x unified',
  };

  const originalTraces = [
    { x: weeks, y: origLikely, type: 'bar', marker: { color: 'rgba(16, 185, 129, 0.15)', line: { color: 'rgba(16, 185, 129, 0.5)', width: 1 }, cornerradius: 4 }, name: 'Current Bar', hoverinfo: 'none' },
    { x: weeks, y: origLikely, type: 'scatter', mode: 'lines+markers', line: { color: '#10B981', width: 2, shape: 'spline' }, marker: { size: 6, color: '#0F172A', line: { color: '#10B981', width: 2 } }, name: 'Current' },
  ];

  const scenarioTraces = [
    { x: weeks, y: scenLikely, type: 'bar', marker: { color: `${scenarioBadge.color}33`, line: { color: `${scenarioBadge.color}80`, width: 1 }, cornerradius: 4 }, name: 'Scenario Bar', hoverinfo: 'none' },
    { x: weeks, y: scenLikely, type: 'scatter', mode: 'lines+markers', line: { color: scenarioBadge.color, width: 2, shape: 'spline' }, marker: { size: 6, color: '#0F172A', line: { color: scenarioBadge.color, width: 2 } }, name: 'Scenario' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-6 rounded-full bg-blue-500"></div>
            <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">Intelligence Lab</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">What-If Scenario Planner</h1>
          <p className="text-slate-400 mt-1">Simulate supply and demand shocks to foresee future inventory constraints.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 font-medium border border-slate-700/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <ShimmerButton onClick={handleApply} disabled={scenarioLoading}>
            <span className="relative flex items-center justify-center gap-2">
              {scenarioLoading ? 'Simulating...' : 'Apply Scenario'}
              {!scenarioLoading && <Play className="w-4 h-4 fill-current" />}
            </span>
          </ShimmerButton>
        </div>
      </div>

      {scenarioError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{scenarioError}</p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          <GlowCard className="p-6 h-full flex flex-col">
            <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Simulation Controls
            </h3>

            <div className="space-y-5 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Product</label>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                    value={productId} 
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Scenario Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {SCENARIO_TYPES.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setScenarioType(st.id);
                        setIntensity(SLIDER_CONFIG[st.id].default);
                      }}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        scenarioType === st.id 
                          ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 ring-1 ring-blue-500/50' 
                          : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <st.icon className="w-5 h-5 mb-2" />
                      <span className="font-semibold text-sm text-slate-200">{st.label}</span>
                      <span className="text-[10px] mt-1 opacity-70">{st.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-end mb-3">
                  <label className="text-sm font-medium text-slate-300">{sliderCfg.label}</label>
                  <span className="text-xl font-bold text-white font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                    {intensity}{sliderCfg.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={sliderCfg.min}
                  max={sliderCfg.max}
                  step={sliderCfg.step}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                />
                <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                  <span>{sliderCfg.min}{sliderCfg.unit}</span>
                  <span>{sliderCfg.max}{sliderCfg.unit}</span>
                </div>
              </div>
            </div>

            {/* Smart Alert inside controls */}
            <div className="mt-6 p-4 rounded-xl relative overflow-hidden group">
              <div className={`absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20`} style={{ backgroundColor: scenarioBadge.color }}></div>
              <div className={`absolute inset-0 border rounded-xl opacity-20`} style={{ borderColor: scenarioBadge.color }}></div>
              
              <div className="relative flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-slate-900 shadow-inner`} style={{ color: scenarioBadge.color }}>
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1" style={{ color: scenarioBadge.color }}>Smart Intelligence</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {smartAlertText}
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Right Column: Charts & Insights */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="grid md:grid-cols-2 gap-6 h-full">
            <GlowCard className="p-5 flex flex-col justify-between" glowColor="#10B981">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">Current Pipeline</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Baseline projection (No changes)</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: `${currentBadge.color}15`, color: currentBadge.color, border: `1px solid ${currentBadge.color}30` }}>
                    {currentBadge.icon && <currentBadge.icon className="w-3 h-3" />}
                    {currentBadge.label}
                  </div>
                </div>
              </div>
              <div className="mt-4 -ml-2 -mb-2">
                <Plot data={originalTraces} layout={sharedLayout} config={chartConfig} style={{ width: '100%' }} />
              </div>
            </GlowCard>

            <GlowCard className="p-5 flex flex-col justify-between" glowColor={scenarioBadge.color}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{appliedType === 'delay' ? 'Risk Projection' : 'Scenario Forecast'}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-wider">
                      Applied: <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded ml-1">{appliedIntensity}{appliedSliderCfg.unit} {appliedType}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: `${scenarioBadge.color}15`, color: scenarioBadge.color, border: `1px solid ${scenarioBadge.color}30` }}>
                    {scenarioBadge.label}
                  </div>
                </div>
              </div>
              <div className="mt-4 -ml-2 -mb-2 relative">
                {scenarioLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10 rounded-xl">
                    <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                ) : null}
                <Plot data={scenarioTraces} layout={sharedLayout} config={chartConfig} style={{ width: '100%' }} />
              </div>
            </GlowCard>
          </div>

          <GlowCard className="p-6 relative overflow-hidden" glowColor="#3B82F6">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Impact Analysis</h3>
                <p className="text-slate-400 text-sm">Strategic summary of your scenario input.</p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl text-slate-300 text-sm leading-relaxed font-medium">
              Simulation of <strong className="text-white">{appliedIntensity}{appliedSliderCfg.unit} {SCENARIO_TYPES.find(t=>t.id===appliedType)?.label}</strong> on 
              <span className="bg-slate-800 text-blue-300 px-2 py-0.5 rounded mx-1">{selectedProduct.name || 'Product'}</span> 
              indicates a <strong className={extraDemand > 0 ? "text-blue-400" : "text-emerald-400"}>volume change of {extraDemand} units</strong>.
              Recommended action: Prepare for estimated marginal cost impact of <strong className="text-white font-mono bg-slate-800 px-1 rounded">₹{extraCost > 0 ? extraCost.toLocaleString() : 0}</strong>.
            </div>

            <div className="flex gap-3 mt-4 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border ${extraDemand > (selectedProduct.current_stock || 0) ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                {extraDemand > (selectedProduct.current_stock || 0) ? <AlertTriangle className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {extraDemand > (selectedProduct.current_stock || 0) ? 'Stock Deficit Warning' : 'Stock Sufficient'}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <Clock className="w-4 h-4" />
                Lead Time: {selectedProduct.lead_time_days || 'N/A'} Days
              </div>
            </div>
          </GlowCard>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Margin Impact",
            value: marginImpact,
            prefix: "",
            suffix: "%",
            trend: marginNegative ? "Critical" : "Positive",
            color: marginNegative ? "red" : "emerald",
            icon: Percent
          },
          {
            label: "Revised Volume",
            value: scenarioResult?.revised_reorder_qty || 0,
            prefix: "",
            suffix: "",
            trend: (scenarioResult?.revised_reorder_qty || 0) > (scenarioResult?.original_reorder_qty || 0) ? "Increased" : "Stable",
            color: "blue",
            icon: Activity 
          },
          {
            label: "Depletion Rate",
            value: parseFloat(depletionRate),
            prefix: "",
            suffix: "x",
            trend: parseFloat(depletionRate) > 1.3 ? "Elevated" : "Normal",
            color: parseFloat(depletionRate) > 1.3 ? "amber" : "emerald",
            icon: Clock
          },
          {
            label: "Revenue Estimate",
            value: revenueEstimate,
            prefix: "₹",
            suffix: "",
            trend: revenueEstimate > 0 ? "Optimal" : "Pending",
            color: revenueEstimate > 0 ? "emerald" : "slate",
            icon: TrendingUp,
            isCurrency: true
          }
        ].map((kpi, i) => (
          <GlowCard key={i} className="p-5 flex flex-col relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500/5 rounded-full blur-2xl -mr-4 -mt-4 transition-all group-hover:bg-${kpi.color}-500/10`}></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">{kpi.label}</span>
              <div className={`p-1.5 rounded-lg bg-${kpi.color}-500/10 text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-auto relative z-10">
              {kpi.prefix && <span className="text-xl font-bold text-slate-400">{kpi.prefix}</span>}
              <AnimatedCounter 
                value={kpi.value} 
                className="text-3xl font-bold text-white tracking-tight leading-none"
              />
              {kpi.suffix && <span className="text-xl font-bold text-slate-400">{kpi.suffix}</span>}
            </div>
            <div className={`mt-3 text-xs font-semibold px-2.5 py-1 rounded-md inline-flex items-center w-max bg-${kpi.color}-500/10 text-${kpi.color}-400 border border-${kpi.color}-500/20 relative z-10`}>
              {kpi.trend === 'Critical' && <ArrowRight className="w-3 h-3 rotate-45 mr-1" />}
              {kpi.trend === 'Positive' && <ArrowRight className="w-3 h-3 -rotate-45 mr-1" />}
              {kpi.trend === 'Increased' && <TrendingUp className="w-3 h-3 mr-1" />}
              {kpi.trend === 'Stable' && <ArrowRight className="w-3 h-3 mr-1" />}
              {kpi.trend === 'Elevated' && <TrendingUp className="w-3 h-3 mr-1" />}
              {kpi.trend === 'Normal' && <Activity className="w-3 h-3 mr-1" />}
              {kpi.trend === 'Optimal' && <ArrowRight className="w-3 h-3 -rotate-45 mr-1" />}
              {kpi.trend}
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  );
}
