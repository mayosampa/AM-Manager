import React, { memo, useMemo } from 'react';
import { DrawingPath } from '../../../types';
import { buildPathGeometry, getPathVisual } from '../utils/svgMath';

interface Props {
  paths: DrawingPath[];
  width: number;
  height: number;
  liveColor: string;
  liveType: DrawingPath['type'];
  livePathRef: React.RefObject<SVGPathElement | null>;
  liveHeadRef: React.RefObject<SVGPolygonElement | null>;
}

/**
 * Saved arrows + the live (in-progress) arrow.
 * - Saved geometry is memoised: it is only recomputed when `paths` or the pitch size change,
 *   never when a token is dragged/selected.
 * - The live path receives NO `d`/`points` props: the controller writes them imperatively
 *   in rAF, so React never reconciles while the user is drawing.
 */
export const PathsLayer = memo(function PathsLayer({ paths, width, height, liveColor, liveType, livePathRef, liveHeadRef }: Props) {
  const rendered = useMemo(
    () => paths.map(p => ({ path: p, geo: buildPathGeometry(p.points, p.type, width, height), visual: getPathVisual(p.type) })),
    [paths, width, height]
  );
  const liveVisual = getPathVisual(liveType);

  return (
    <g>
      {rendered.map(({ path, geo, visual }) => (
        <g key={path.id}>
          <path
            d={geo.d}
            fill="none"
            stroke={path.color}
            strokeWidth={visual.strokeWidth}
            strokeDasharray={visual.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {geo.head && <polygon points={geo.head} fill={path.color} stroke={path.color} strokeWidth={1} strokeLinejoin="round" />}
        </g>
      ))}

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
      />
      <polygon ref={liveHeadRef} fill={liveColor} stroke={liveColor} strokeWidth={1} strokeLinejoin="round" />
    </g>
  );
});
