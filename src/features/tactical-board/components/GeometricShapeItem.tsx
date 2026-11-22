import React, { memo } from 'react';
import { GeometricShape, ToolMode } from '../../../types';

interface Props {
  key?: React.Key;
  shape: GeometricShape;
  isSelected: boolean;
  /** Real pitch size in px (shape points are stored in % and converted here). */
  width: number;
  height: number;
  currentTool?: ToolMode;
  onMoveStart?: (e: React.PointerEvent, shape: GeometricShape) => void;
  onResizeStart?: (e: React.PointerEvent, shape: GeometricShape, handleIndex: number) => void;
  onDelete?: (id: string) => void;
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

export const GeometricShapeItem = memo(function GeometricShapeItem({
  shape,
  isSelected,
  width,
  height,
  currentTool = 'pointer',
  onMoveStart,
  onResizeStart,
  onDelete,
}: Props) {
  const { type, points, color } = shape;
  if (points.length < 2 || width <= 0 || height <= 0) return null;

  // % → px (keeps circles round on non-square pitches)
  const px = points.map(p => ({ x: (p.x / 100) * width, y: (p.y / 100) * height }));
  const fill = toFill(color);
  const common = {
    fill,
    stroke: color,
    strokeWidth: isSelected ? 2.5 : 2,
    vectorEffect: 'non-scaling-stroke' as const,
  };

  let body: React.ReactNode = null;
  let deletePos = { x: 0, y: 0 };

  if (type === 'rectangle') {
    const [a, b] = px;
    body = (
      <rect
        x={Math.min(a.x, b.x)}
        y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        {...common}
      />
    );
    deletePos = { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) };
  } else if (type === 'circle') {
    const [c, e] = px;
    const r = Math.hypot(e.x - c.x, e.y - c.y);
    body = <circle cx={c.x} cy={c.y} r={r} {...common} />;
    deletePos = { x: c.x + r * 0.7071, y: c.y - r * 0.7071 };
  } else if (type === 'polygon') {
    body = <polygon points={px.map(p => `${p.x},${p.y}`).join(' ')} {...common} />;
    deletePos = { x: Math.max(...px.map(p => p.x)), y: Math.min(...px.map(p => p.y)) };
  } else if (type === 'line') {
    const [a, b] = px;
    body = (
      <>
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="transparent"
          strokeWidth={22}
          strokeLinecap="round"
        />
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={color}
          strokeWidth={isSelected ? 4.5 : 3.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </>
    );
    deletePos = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  const isInteractive = Boolean(onMoveStart || onDelete);

  return (
    <g
      className={
        !isInteractive
          ? 'pointer-events-none'
          : currentTool === 'eraser'
          ? 'pointer-events-auto cursor-pointer'
          : isSelected
          ? 'pointer-events-auto cursor-move'
          : 'pointer-events-auto cursor-grab active:cursor-grabbing'
      }
      style={{
        touchAction: 'none',
        pointerEvents: isInteractive ? 'visiblePainted' : 'none',
      }}
      onPointerDown={(e) => {
        if (!isInteractive) return;
        e.stopPropagation();
        e.preventDefault();
        if (currentTool === 'eraser') {
          onDelete?.(shape.id);
          return;
        }
        onMoveStart?.(e, shape);
      }}
      filter={isSelected ? 'url(#tactical-glow)' : undefined}
    >
      {body}

      {isSelected && onResizeStart && px.map((p, i) => (
        <g
          key={i}
          data-export-exclude="true"
          className="pointer-events-auto cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => onResizeStart(e, shape, i)}
        >
          <circle cx={p.x} cy={p.y} r={HANDLE_HIT_R} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={HANDLE_R} fill="#ffffff" stroke="#059669" strokeWidth={2.5} />
        </g>
      ))}

      {isSelected && onDelete && (
        <g
          data-export-exclude="true"
          transform={`translate(${deletePos.x}, ${deletePos.y})`}
          className="cursor-pointer pointer-events-auto group/delbtn"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(shape.id);
          }}
        >
          <circle r={13} fill="rgba(0, 0, 0, 0.45)" cy={1.5} />
          <circle
            r={12}
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="transition-transform group-hover/delbtn:scale-110"
          />
          <path
            d="M -4 -4 L 4 4 M 4 -4 L -4 4"
            stroke="#ffffff"
            strokeWidth={2}
            strokeLinecap="round"
            className="pointer-events-none"
          />
        </g>
      )}
    </g>
  );
});
