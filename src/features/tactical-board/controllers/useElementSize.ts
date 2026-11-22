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

/**
 * Computes a 105:68 pitch size (CSS width/height strings) from a container ref
 * using the rAF-coalesced ResizeObserver in useElementSize.
 * Fits 100% inside the available central canvas in both normal and fullscreen modes.
 */
export function usePitchAspectRatioSize<T extends HTMLElement>(
  ref: RefObject<T | null>,
  scale = 0.99,
  _isFullscreen = false,
): { width: string; height: string } {
  const { width, height } = useElementSize(ref);
  if (width <= 0 || height <= 0) {
    return { width: '100%', height: '100%' };
  }
  const aspect = 105 / 68;
  const availW = Math.max(0, (width - 16) * scale);
  const availH = Math.max(0, (height - 16) * scale);
  if (availW <= 0 || availH <= 0) {
    return { width: '100%', height: '100%' };
  }
  const fitW = Math.min(availW, availH * aspect);
  const fitH = fitW / aspect;
  return {
    width: `${Math.floor(fitW)}px`,
    height: `${Math.floor(fitH)}px`,
  };
}
