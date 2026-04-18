import { useState, useEffect, Component } from 'react';

/**
 * Error boundary that catches Plotly render crashes
 * and shows a fallback instead of blanking the entire page.
 */
class PlotErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.warn('PlotChart render error caught by boundary:', error, info);
  }

  componentDidUpdate(prevProps) {
    // Reset error state when data changes (e.g. new navigation)
    if (prevProps.dataKey !== this.props.dataKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: this.props.height || 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 8,
          }}
        >
          <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Chart unavailable</span>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Resolve the actual Plot component from react-plotly.js module.
 * Handles CJS/ESM interop: could be mod.default or mod.default.default.
 */
function resolvePlotComponent(mod) {
  let Comp = mod.default || mod;
  if (Comp && typeof Comp !== 'function' && Comp.default) {
    Comp = Comp.default;
  }
  return typeof Comp === 'function' ? Comp : null;
}

/**
 * Plotly chart wrapper with dynamic import.
 *
 * FIX: Removed the module-level _cachedPlotComponent variable that
 * was causing "Cannot call a class as a function" crashes.
 *
 * The old code cached the resolved component reference in a module-level
 * variable and reused it across route navigations. When React Router
 * unmounted and remounted a page with PlotChart, the stale class reference
 * from the previous module evaluation context would fail with the
 * "Cannot call a class as a function" TypeError.
 *
 * Now each PlotChart instance does its own dynamic import.
 * The browser/bundler deduplicates the actual network request, so there's
 * no performance penalty — `import()` returns a cached module promise.
 */
export default function PlotChart({ data, layout, config, style, ...rest }) {
  const [PlotComp, setPlotComp] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    import('react-plotly.js').then((mod) => {
      const Comp = resolvePlotComponent(mod);
      if (!cancelled && Comp) {
        setPlotComp(() => Comp);
      } else if (!cancelled) {
        console.error('react-plotly.js did not export a valid React component.');
      }
    }).catch(err => {
      console.error('Failed to load react-plotly.js:', err);
    });

    return () => { cancelled = true; };
  }, []);

  // Bump revision when data changes to force Plotly to re-draw
  useEffect(() => {
    setRevision(r => r + 1);
  }, [data, layout]);

  const mergedConfig = {
    displayModeBar: false,
    responsive: true,
    ...config,
  };

  // Generate a stable key based on data
  let dataKey;
  try {
    dataKey = JSON.stringify(data?.map?.(d => d?.values || d?.y || []) || []);
  } catch {
    dataKey = String(revision);
  }

  if (!PlotComp) {
    return (
      <div
        style={{
          ...style,
          height: layout?.height || 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
        }}
      >
        <span style={{ color: '#64748B', fontSize: '0.875rem' }}>Loading chart…</span>
      </div>
    );
  }

  return (
    <PlotErrorBoundary dataKey={dataKey} height={layout?.height}>
      <PlotComp
        data={data}
        layout={layout}
        config={mergedConfig}
        style={style}
        revision={revision}
        useResizeHandler
        {...rest}
      />
    </PlotErrorBoundary>
  );
}
