import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedText — Staggered word/character reveal triggered on scroll.
 * Supports 'words' and 'chars' split modes.
 */
export default function AnimatedText({
  text,
  as: Tag = 'h1',
  split = 'words',
  staggerDelay = 60,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const items = split === 'chars' ? text.split('') : text.split(' ');

  return (
    <Tag
      ref={containerRef}
      className={`animated-text ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: split === 'chars' ? '0' : '0.3em',
        overflow: 'hidden',
        ...style,
      }}
    >
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            transform: isVisible ? 'translateY(0)' : 'translateY(110%)',
            opacity: isVisible ? 1 : 0,
            transition: `transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * staggerDelay}ms, opacity 0.6s ease ${i * staggerDelay}ms`,
            willChange: 'transform, opacity',
          }}
        >
          {item === ' ' ? '\u00A0' : item}
        </span>
      ))}
    </Tag>
  );
}
