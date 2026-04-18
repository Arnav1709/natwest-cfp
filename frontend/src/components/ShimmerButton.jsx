import { useRef } from 'react';

/**
 * ShimmerButton — Button with animated light sweep + magnetic hover.
 */
export default function ShimmerButton({ children, onClick, className = '', style = {}, disabled = false, id, type = 'button' }) {
  const btnRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btnRef.current.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px) translateY(-2px)`;
  };

  const handleMouseLeave = () => {
    if (btnRef.current) {
      btnRef.current.style.transform = 'translate(0, 0)';
    }
  };

  const handleClick = (e) => {
    if (disabled) return;

    // Ripple effect
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${e.clientX - rect.left - size / 2}px;
      top: ${e.clientY - rect.top - size / 2}px;
      background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out forwards;
      pointer-events: none;
      z-index: 0;
    `;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    onClick?.(e);
  };

  return (
    <button
      ref={btnRef}
      type={type}
      className={`shimmer-btn ${className}`}
      id={id}
      disabled={disabled}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.875rem 2rem',
        background: 'linear-gradient(135deg, #0D9488, #10B981)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        fontSize: 'var(--font-size-sm)',
        fontWeight: 700,
        fontFamily: 'var(--font-display)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        opacity: disabled ? 0.6 : 1,
        minHeight: '48px',
        letterSpacing: '0.01em',
        textDecoration: 'none',
        ...style,
      }}
    >
      {/* Shimmer sweep */}
      <span style={{
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '60%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        animation: 'shimmer-btn 3s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
    </button>
  );
}
