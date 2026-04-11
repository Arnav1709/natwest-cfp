import { useState, useEffect } from 'react';

let _cachedPlotComponent = null;

/**
 * Plotly chart wrapper that handles CJS/ESM interop properly.
 * react-plotly.js default export is a CJS module that Vite wraps in
 * { default: { default: PlotComponent } }, so we unwrap it dynamically.
 */
export default function PlotChart({ data, layout, config, style, ...rest }) {
  const [PlotComp, setPlotComp] = useState(_cachedPlotComponent);

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

  const mergedConfig = {
    displayModeBar: false,
    responsive: true,
    ...config,
  };

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
    <PlotComp
      data={data}
      layout={layout}
      config={mergedConfig}
      style={style}
      useResizeHandler
      {...rest}
    />
  );
}
