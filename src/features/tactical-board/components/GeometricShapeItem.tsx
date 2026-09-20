import React from 'react';
import { GeometricShape } from '../../../types';

interface Props {
  shape: GeometricShape;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, handleIndex: number) => void;
}

export function GeometricShapeItem({ shape, isSelected, onPointerDown, onResizeStart }: Props) {
  const { type, points, color } = shape;
  if (points.length < 2) return null;

  // Use a subtle fill color
  // Parse color to rgba for 20% opacity
  const getFill = (hex: string) => {
    // If it's a named color or rgba already, just return with opacity or fallback. 
    // Assuming hex for now.
    if (hex.startsWith('#')) {
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, 0.2)`;
    }
    return 'rgba(255, 255, 255, 0.2)';
  };

  const fill = getFill(color);
  const stroke = color;

  const renderShape = () => {
    if (type === 'rectangle') {
      const [p1, p2] = points;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      return <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth="0.4" />;
    }
    if (type === 'circle') {
      const [center, edge] = points;
      const r = Math.hypot(edge.x - center.x, edge.y - center.y);
      return <circle cx={center.x} cy={center.y} r={r} fill={fill} stroke={stroke} strokeWidth="0.4" />;
    }
    if (type === 'polygon') {
      const pts = points.map(p => `${p.x},${p.y}`).join(' ');
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="0.4" />;
    }
    return null;
  };

  return (
    <g 
      style={{ cursor: 'pointer', pointerEvents: 'auto' }} 
      onPointerDown={onPointerDown}
      filter={isSelected ? "url(#tactical-glow)" : undefined}
    >
      {renderShape()}
      
      {/* Handles for resizing if selected */}
      {isSelected && points.map((p, i) => (
        <circle 
          key={i} 
          cx={p.x} 
          cy={p.y} 
          r="1.5" 
          fill="#ffffff" 
          stroke="#000000" 
          strokeWidth="0.3"
          style={{ cursor: 'crosshair' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e, i);
          }}
        />
      ))}
    </g>
  );
}
