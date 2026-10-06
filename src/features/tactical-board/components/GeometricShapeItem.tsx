import React, { memo } from 'react';
import { GeometricShape } from '../../../types';

interface Props {
  shape: GeometricShape;
  isSelected: boolean;
  /** Real pitch size in px (shape points are stored in % and converted here). */
  width: number;
  height: number;
  onSelect?: (e: React.PointerEvent, id: string) => void;
  onResizeStart?: (e: React.PointerEvent, shape: GeometricShape, handleIndex: number) => void;
}

const HANDLE_R = 7;      // visible handle radius (px)
const HANDLE_HIT_R = 18; // invisible touch target radius (px)

const toFill = (hex: string) => {
  if (hex.startsWith('#') && hex.length >= 7) {
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, 0.2)`;
  }
  return 'rgba(255, 255, 255, 0.2)';
};

export const GeometricShapeItem = memo(function GeometricShapeItem({ shape, isSelected, width, height, onSelect, onResizeStart }: Props) {
  const { type, points, color } = shape;
  if (points.length < 2 || width <= 0 || height <= 0) return null;

  // % → px (keeps circles round on non-square pitches)
  const px = points.map(p => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
  const fill = toFill(color);
  const common = { fill, stroke: color, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const };

  let body: React.ReactNode = null;
  if (type === 'rectangle') {
    const [a, b] = px;
    body = <rect x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)} width={Math.abs(b.x - a.x)} height={Math.abs(b.y - a.y)} {...common} />;
  } else if (type === 'circle') {
    const [c, e] = px;
    body = <circle cx={c.x} cy={c.y} r={Math.hypot(e.x - c.x, e.y - c.y)} {...common} />;
  } else if (type === 'polygon') {
    body = <polygon points={px.map(p => `${p.x},${p.y}`).join(' ')} {...common} />;
  } else if (type === 'line') {
    const [a, b] = px;
    body = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={4} strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="visiblePainted" />;
  }

  return (
    <g
      style={{ cursor: onSelect ? 'pointer' : 'default', pointerEvents: onSelect ? 'visiblePainted' : 'none' }}
      onPointerDown={onSelect ? (e) => onSelect(e, shape.id) : undefined}
      filter={isSelected ? 'url(#tactical-glow)' : undefined}
    >
      {body}
      {isSelected && onResizeStart && px.map((p, i) => (
        <g
          key={i}
          style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
          onPointerDown={(e) => onResizeStart(e, shape, i)}
        >
          <circle cx={p.x} cy={p.y} r={HANDLE_HIT_R} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={HANDLE_R} fill="#ffffff" stroke="#FF4B4B" strokeWidth={2.5} />
        </g>
      ))}
    </g>
  );
});
