import { RefObject, useEffect, useState } from 'react';

/**
 * Tracks the real rendered pixel size of an element (ResizeObserver, rAF-coalesced).
 * The SVG overlay uses it as its viewBox so 1 SVG unit === 1 CSS pixel in every
 * layout (windowed, fullscreen, mobile): no stretching, no coordinate drift.
 */
export function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const { width, height } = el.getBoundingClientRect();
      setSize(prev => (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5 ? prev : { width, height }));
    };

    const observer = new ResizeObserver(() => {
      if (frame === null) frame = requestAnimationFrame(measure);
    });
    observer.observe(el);
    measure();

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ref]);

  return size;
}
