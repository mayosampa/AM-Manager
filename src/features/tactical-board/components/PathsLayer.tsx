import React, { memo, useMemo } from 'react';
import { DrawingPath, ToolMode } from '../../../types';
import { buildPathGeometry, getPathVisual, getPathMidpointPx } from '../utils/arrowGeometry';

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
}

/**
 * Saved arrows + the live (in-progress) arrow.
 * - Uses unified arrow geometry (arrowGeometry.ts) for perfect straight/curved vectors and filled arrowheads.
 * - Hit testing: wider transparent stroke (18px) for effortless click selection.
 * - When an arrow is selected:
 *   1. Its body is highlighted.
 *   2. A red circular button with a white cross ('×') is rendered at the exact midpoint of the arrow.
 *   3. Clicking this cross deletes the arrow immediately and clears selection.
 * - The live path attributes are written imperatively in rAF by useBoardManager.paintLivePath.
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
}: Props) {
  const rendered = useMemo(
    () => paths.map(p => ({
      path: p,
      geo: buildPathGeometry(p, width, height, 1.0),
      visual: getPathVisual(p.type),
      midpoint: getPathMidpointPx(p, width, height),
    })),
    [paths, width, height]
  );

  const liveVisual = getPathVisual(liveType);

  return (
    <g>
      {rendered.map(({ path, geo, visual, midpoint }) => {
        const isSelected = selectedPathId === path.id;

        return (
          <g key={path.id} className="cursor-pointer group/arrow">
            {/* Invisible wide hit area (18px) for easy click/touch selection */}
            <path
              d={geo.d}
              fill="none"
              stroke="transparent"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-auto cursor-pointer"
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
              d={geo.d}
              fill="none"
              stroke={isSelected ? '#ffffff' : path.color}
              strokeWidth={isSelected ? visual.strokeWidth + 1.6 : visual.strokeWidth}
              strokeDasharray={visual.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none transition-all duration-100"
            />

            {/* Filled triangular arrowhead */}
            {geo.head && (
              <polygon
                points={geo.head}
                fill={isSelected ? '#ffffff' : path.color}
                stroke={isSelected ? '#ffffff' : path.color}
                strokeWidth={isSelected ? 1.5 : 1}
                strokeLinejoin="round"
                className="pointer-events-none transition-all duration-100"
              />
            )}

            {/* Red circular delete button with white cross (×) at midpoint when selected */}
            {isSelected && midpoint && (
              <g
                transform={`translate(${midpoint.x}, ${midpoint.y})`}
                className="cursor-pointer pointer-events-auto group/delbtn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePath?.(path.id);
                  onSelectPath?.(null);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Outer shadow */}
                <circle r={13} fill="rgba(0, 0, 0, 0.45)" cy={1.5} />
                {/* Red circle */}
                <circle
                  r={12}
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  className="transition-transform group-hover/delbtn:scale-115"
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
