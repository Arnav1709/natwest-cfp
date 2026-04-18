/**
 * AuroraBackground — Animated gradient blobs creating aurora borealis effect.
 * Pure CSS with randomized timings for organic feel.
 */
export default function AuroraBackground({ intensity = 'normal', className = '' }) {
  const blobStyles = intensity === 'subtle' ? {
    blob1Opacity: 0.08,
    blob2Opacity: 0.06,
    blob3Opacity: 0.04,
  } : {
    blob1Opacity: 0.15,
    blob2Opacity: 0.10,
    blob3Opacity: 0.08,
  };

  return (
    <div
      className={`aurora-bg ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Blob 1 — Teal */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '60%',
        height: '60%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
        opacity: blobStyles.blob1Opacity,
        filter: 'blur(80px)',
        animation: 'morph 15s ease-in-out infinite, float-slow 12s ease-in-out infinite',
      }} />

      {/* Blob 2 — Purple */}
      <div style={{
        position: 'absolute',
        top: '10%',
        right: '-15%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
        opacity: blobStyles.blob2Opacity,
        filter: 'blur(80px)',
        animation: 'morph 18s ease-in-out infinite reverse, float-slow 14s ease-in-out infinite 2s',
      }} />

      {/* Blob 3 — Blue */}
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '20%',
        width: '45%',
        height: '45%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.35) 0%, transparent 70%)',
        opacity: blobStyles.blob3Opacity,
        filter: 'blur(80px)',
        animation: 'morph 20s ease-in-out infinite, float-slow 16s ease-in-out infinite 4s',
      }} />

      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        opacity: 0.5,
      }} />
    </div>
  );
}
