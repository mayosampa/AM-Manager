import React, { memo, useMemo } from 'react';
import { DrawingPath, ToolMode } from '../../../types';
import { buildPathGeometry, getPathVisual, getPathMidpointPx, resolveStroke } from '../utils/arrowGeometry';

interface Props {
  paths: DrawingPath[];
  width: number;
  height: number;
  liveColor: string;
  liveType: DrawingPath['type'];
  livePathRef: React.RefObject<SVGPathElement | null>;
  liveHeadRef: React.RefObject<SVGPolygonElement | null>;
  currentTool?: ToolMode;
  selectedPathId?: string | null;
  onSelectPath?: (id: string | null) => void;
  onDeletePath?: (id: string) => void;
  onEditPathStart?: (
    e: React.PointerEvent,
    id: string,
    mode: 'start' | 'end' | 'control' | 'body'
  ) => void;
}

/**
 * Saved arrows + the live (in-progress) arrow.
 * - Uses unified arrow geometry (arrowGeometry.ts) for perfect straight/curved vectors and filled arrowheads.
 * - Hit testing: wider transparent stroke (18px) for effortless click selection.
 * - When an arrow is selected:
 *   1. Its body is highlighted and dragging the body translates the entire arrow.
 *   2. Draggable circular handles at start, end (and control if curved) resize/reorient the arrow in real time.
 *   3. A red circular button with a white cross ('×') is rendered at the midpoint to delete the arrow.
 * - The live path and edited path attributes are written imperatively in rAF by useBoardManager.
 */
export const PathsLayer = memo(function PathsLayer({
  paths,
  width,
  height,
  liveColor,
  liveType,
  livePathRef,
  liveHeadRef,
  currentTool = 'pointer',
  selectedPathId,
  onSelectPath,
  onDeletePath,
  onEditPathStart,
}: Props) {
  const rendered = useMemo(
    () => paths.map(p => ({
      path: p,
      stroke: resolveStroke(p),
      geo: buildPathGeometry(p, width, height, 1.0),
      visual: getPathVisual(p.type),
      midpoint: getPathMidpointPx(p, width, height),
    })),
    [paths, width, height]
  );

  const liveVisual = getPathVisual(liveType);

  return (
    <g>
      {rendered.map(({ path, stroke, geo, visual, midpoint }) => {
        const isSelected = selectedPathId === path.id;
        const startPx = stroke ? { x: (stroke.start.x / 100) * width, y: (stroke.start.y / 100) * height } : null;
        const endPx = stroke ? { x: (stroke.end.x / 100) * width, y: (stroke.end.y / 100) * height } : null;
        const ctrlPx = stroke?.control ? { x: (stroke.control.x / 100) * width, y: (stroke.control.y / 100) * height } : null;

        return (
          <g key={path.id} className="cursor-pointer group/arrow">
            {/* Invisible wide hit area (20px) for easy click/touch selection and body dragging */}
            <path
              id={`path-hit-${path.id}`}
              d={geo.d}
              fill="none"
              stroke="transparent"
              strokeWidth={20}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`pointer-events-auto ${isSelected ? 'cursor-move' : 'cursor-pointer'}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onEditPathStart) {
                  onEditPathStart(e, path.id, 'body');
                } else {
                  onSelectPath?.(path.id);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPath?.(path.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelectPath?.(path.id);
              }}
            />

            {/* Selection highlight glow if selected */}
            {isSelected && (
              <path
                id={`path-glow-${path.id}`}
                d={geo.d}
                fill="none"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth={visual.strokeWidth + 5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="pointer-events-none"
              />
            )}

            {/* Visible arrow body */}
            <path
              id={`path-body-${path.id}`}
              d={geo.d}
              fill="none"
              stroke={isSelected ? '#ffffff' : path.color}
              strokeWidth={isSelected ? visual.strokeWidth + 1.6 : visual.strokeWidth}
              strokeDasharray={visual.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none"
            />

            {/* Filled triangular arrowhead */}
            {geo.head && (
              <polygon
                id={`path-head-${path.id}`}
                points={geo.head}
                fill={isSelected ? '#ffffff' : path.color}
                stroke={isSelected ? '#ffffff' : path.color}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeLinejoin="round"
                className="pointer-events-none"
              />
            )}

            {/* Curve control guide line when selected and curved */}
            {isSelected && startPx && endPx && ctrlPx && (
              <path
                id={`path-guide-control-${path.id}`}
                d={`M ${startPx.x} ${startPx.y} L ${ctrlPx.x} ${ctrlPx.y} L ${endPx.x} ${endPx.y}`}
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                className="pointer-events-none"
              />
            )}

            {/* Draggable endpoint handles (start, end, and control if curved) - NO CSS scale transform on SVG circles */}
            {isSelected && startPx && (
              <circle
                id={`path-handle-start-${path.id}`}
                cx={startPx.x}
                cy={startPx.y}
                r={7}
                fill="#ffffff"
                stroke={path.color === '#ffffff' ? '#10b981' : path.color}
                strokeWidth={3}
                className="pointer-events-auto cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEditPathStart?.(e, path.id, 'start');
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {isSelected && endPx && (
              <circle
                id={`path-handle-end-${path.id}`}
                cx={endPx.x}
                cy={endPx.y}
                r={7}
                fill="#ffffff"
                stroke={path.color === '#ffffff' ? '#10b981' : path.color}
                strokeWidth={3}
                className="pointer-events-auto cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEditPathStart?.(e, path.id, 'end');
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {isSelected && ctrlPx && (
              <circle
                id={`path-handle-control-${path.id}`}
                cx={ctrlPx.x}
                cy={ctrlPx.y}
                r={7}
                fill="#fef08a"
                stroke="#ca8a04"
                strokeWidth={2.5}
                className="pointer-events-auto cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEditPathStart?.(e, path.id, 'control');
                }}
                onClick={(e) => e.stopPropagation()}
              />
            )}

            {/* Red circular delete button with white cross (×) at midpoint when selected */}
            {isSelected && midpoint && (
              <g
                id={`path-del-${path.id}`}
                transform={`translate(${midpoint.x}, ${midpoint.y})`}
                className="cursor-pointer pointer-events-auto"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDeletePath?.(path.id);
                  onSelectPath?.(null);
                }}
              >
                {/* Outer shadow */}
                <circle r={13} fill="rgba(0, 0, 0, 0.45)" cy={1.5} />
                {/* Red circle */}
                <circle
                  r={12}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
                {/* White cross (×) */}
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
      })}

      {/* Live preview — attributes written by useBoardManager.paintLivePath */}
      <path
        ref={livePathRef}
        fill="none"
        stroke={liveColor}
        strokeWidth={liveVisual.strokeWidth}
        strokeDasharray={liveVisual.dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="pointer-events-none"
      />
      <polygon
        ref={liveHeadRef}
        fill={liveColor}
        stroke={liveColor}
        strokeWidth={1}
        strokeLinejoin="round"
        className="pointer-events-none"
      />
    </g>
  );
});
