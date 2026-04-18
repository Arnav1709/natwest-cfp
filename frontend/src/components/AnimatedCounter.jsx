import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter — Numbers count up from 0 with smooth easing.
 * Supports prefix (₹) and suffix (%, K).
 */
export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(numericValue)) {
      setDisplay(value);
      return;
    }

    const from = prevValue.current;
    const to = numericValue;
    prevValue.current = to;

    const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const current = from + (to - from) * easedProgress;

      setDisplay(current.toFixed(decimals));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration, decimals]);

  return (
    <span className="animated-counter" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{display}{suffix}
    </span>
  );
}
