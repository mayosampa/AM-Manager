import React, { memo, useMemo, useState } from 'react';
import { DrawingPath, ToolMode } from '../../../types';
import { buildPathGeometry, getPathVisual } from '../utils/arrowGeometry';

interface Props {
  paths: DrawingPath[];
  width: number;
  height: number;
  liveColor: string;
  liveType: DrawingPath['type'];
  livePathRef: React.RefObject<SVGPathElement | null>;
  liveHeadRef: React.RefObject<SVGPolygonElement | null>;
  currentTool?: ToolMode;
  onDeletePath?: (id: string) => void;
}

/**
 * Saved arrows + the live (in-progress) arrow.
 * - Uses unified arrow geometry (arrowGeometry.ts) for perfect straight/curved vectors and filled arrowheads.
 * - Hit testing: wider transparent stroke (18px) for effortless click/tap deletion.
 * - Hover highlight when eraser or pointer tool is active.
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
  onDeletePath,
}: Props) {
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);

  const rendered = useMemo(
    () => paths.map(p => ({
      path: p,
      geo: buildPathGeometry(p, width, height, 1.0),
      visual: getPathVisual(p.type),
    })),
    [paths, width, height]
  );

  const liveVisual = getPathVisual(liveType);
  const isDeletable = Boolean(onDeletePath && (currentTool === 'eraser' || currentTool === 'pointer'));

  return (
    <g>
      {rendered.map(({ path, geo, visual }) => {
        const isHovered = hoveredPathId === path.id && (currentTool === 'eraser' || currentTool === 'pointer');
        const isEraserHover = hoveredPathId === path.id && currentTool === 'eraser';
        const displayColor = isEraserHover ? '#ef4444' : path.color;

        return (
          <g
            key={path.id}
            className={isDeletable ? 'cursor-pointer group/arrow' : ''}
            onMouseEnter={() => isDeletable && setHoveredPathId(path.id)}
            onMouseLeave={() => hoveredPathId === path.id && setHoveredPathId(null)}
          >
            {/* Invisible wide hit area for easy click/touch deletion */}
            <path
              d={geo.d}
              fill="none"
              stroke="transparent"
              strokeWidth={18}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isDeletable ? 'pointer-events-auto cursor-pointer' : 'pointer-events-auto'}
              onClick={(e) => {
                if (isDeletable && onDeletePath) {
                  e.stopPropagation();
                  onDeletePath(path.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeletePath?.(path.id);
              }}
            />

            {/* Visible arrow body */}
            <path
              d={geo.d}
              fill="none"
              stroke={displayColor}
              strokeWidth={isHovered ? visual.strokeWidth + 1.2 : visual.strokeWidth}
              strokeDasharray={isEraserHover ? '4 3' : visual.dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="pointer-events-none transition-all duration-100"
            />

            {/* Filled triangular arrowhead */}
            {geo.head && (
              <polygon
                points={geo.head}
                fill={displayColor}
                stroke={displayColor}
                strokeWidth={1}
                strokeLinejoin="round"
                className="pointer-events-none transition-all duration-100"
              />
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
