import { useState, useEffect, Component } from 'react';

let _cachedPlotComponent = null;

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
 * Plotly chart wrapper that handles CJS/ESM interop properly.
 * react-plotly.js default export is a CJS module that Vite wraps in
 * { default: { default: PlotComponent } }, so we unwrap it dynamically.
 */
export default function PlotChart({ data, layout, config, style, ...rest }) {
  const [PlotComp, setPlotComp] = useState(_cachedPlotComponent);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (_cachedPlotComponent) return;

    let cancelled = false;
    import('react-plotly.js').then((mod) => {
      // Handle CJS interop: could be mod.default or mod.default.default
      let Component = mod.default || mod;
      if (Component && typeof Component !== 'function' && Component.default) {
        Component = Component.default;
      }
      if (!cancelled && typeof Component === 'function') {
        _cachedPlotComponent = Component;
        setPlotComp(() => Component);
      } else if (!cancelled) {
        console.error('react-plotly.js did not export a valid React component. Got:', typeof Component, Component);
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

  // Generate a stable key based on data to force clean re-mounts
  const dataKey = JSON.stringify(data?.map?.(d => d?.values || d?.y || []) || []);

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
        key={dataKey}
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
