import React, { useRef, useState, useCallback } from 'react';
import { PitchLines } from './PitchLines';
import { TacticalLanes } from './TacticalLanes';
import { BoardTokenItem } from './BoardTokenItem';
import { SVGGlobals } from './TokenSVGs';
import { GeometricShapeItem } from './GeometricShapeItem';
import { ContextualTokenMenu } from './ContextualTokenMenu';
import { useBoardManager } from '../controllers/useBoardManager';
import { getSmoothBezierPath, getWavyPath } from '../utils/svgMath';
import { Point, DrawingPath, GeometricShape } from '../../../types';

const COLORS = [
  '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', 
  '#a855f7', '#f97316', '#14b8a6', '#000000',
];

interface Props {
  manager: ReturnType<typeof useBoardManager>;
  pitchSize: { width: string; height: string };
  containerRef: React.RefObject<HTMLDivElement>;
  onEditToken?: (id: string) => void;
  isFullscreen?: boolean;
}

export function TacticalCanvas({ manager, pitchSize, containerRef, isFullscreen }: Props) {
  const { 
    boardRef, boardState, setBoardState, isPlaying, 
    currentPathPoints, handleBoardPointerDown, handleBoardPointerMove, 
    handleBoardPointerUp, handleTokenPointerDown 
  } = manager;

  // Local state for drawing shapes interactively without triggering massive re-renders
  const [draftShape, setDraftShape] = useState<GeometricShape | null>(null);
  
  // Refs for fast resizing of shapes
  const resizingShapeId = useRef<string | null>(null);
  const resizingHandleIdx = useRef<number | null>(null);
  
  const getRelativePosition = useCallback((clientX: number, clientY: number): Point => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, [boardRef]);

  const onPointerDown = (e: React.PointerEvent) => {
    const pos = getRelativePosition(e.clientX, e.clientY);
    
    // Clear selection if clicking on empty space
    if (boardState.currentTool === 'pointer') {
      setBoardState(prev => ({ ...prev, selectedTokenId: null, selectedShapeId: null }));
    }

    if (['rectangle', 'circle', 'polygon'].includes(boardState.currentTool)) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      
      if (boardState.currentTool === 'polygon') {
        if (draftShape && draftShape.type === 'polygon') {
          // Double click check could go here, but let's just append
          setDraftShape({
            ...draftShape,
            points: [...draftShape.points, pos]
          });
        } else {
          setDraftShape({
            id: crypto.randomUUID(),
            type: 'polygon',
            color: boardState.drawingColor,
            points: [pos]
          });
        }
      } else {
        // Rectangle or Circle
        setDraftShape({
          id: crypto.randomUUID(),
          type: boardState.currentTool as 'rectangle' | 'circle',
          color: boardState.drawingColor,
          points: [pos, pos] // start and current end
        });
      }
      return;
    }

    handleBoardPointerDown(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pos = getRelativePosition(e.clientX, e.clientY);

    // Shape Drawing
    if (draftShape) {
      if (draftShape.type === 'polygon') {
        // Update the last point
        const newPoints = [...draftShape.points];
        newPoints[newPoints.length - 1] = pos;
        setDraftShape({ ...draftShape, points: newPoints });
      } else {
        setDraftShape({
          ...draftShape,
          points: [draftShape.points[0], pos]
        });
      }
      return;
    }

    // Shape Resizing
    if (resizingShapeId.current && resizingHandleIdx.current !== null) {
      setBoardState(prev => ({
        ...prev,
        shapes: prev.shapes.map(s => {
          if (s.id !== resizingShapeId.current) return s;
          const newPoints = [...s.points];
          newPoints[resizingHandleIdx.current!] = pos;
          return { ...s, points: newPoints };
        })
      }));
      return;
    }

    handleBoardPointerMove(e);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (draftShape) {
      if (draftShape.type !== 'polygon') {
        // Commit shape
        setBoardState(prev => ({
          ...prev,
          shapes: [...prev.shapes, draftShape],
          currentTool: 'pointer' // switch back to pointer
        }));
        setDraftShape(null);
      }
      // Polygon waits for double click
    }

    if (resizingShapeId.current) {
      resizingShapeId.current = null;
      resizingHandleIdx.current = null;
    }

    handleBoardPointerUp(e);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (draftShape && draftShape.type === 'polygon') {
      setBoardState(prev => ({
        ...prev,
        shapes: [...prev.shapes, draftShape],
        currentTool: 'pointer'
      }));
      setDraftShape(null);
    }
  };
  const pitchW = parseFloat(pitchSize.width) || 100;
  const pitchH = parseFloat(pitchSize.height) || 100;

  const getPathStyles = (type: DrawingPath['type'], color: string) => {
    switch (type) {
      case 'dribble': return { strokeDasharray: '0', strokeWidth: '1.5', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'pass': return { strokeDasharray: '0', strokeWidth: '1.5', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'run': return { strokeDasharray: '6,6', strokeWidth: '1.5', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'shot': return { strokeDasharray: '0', strokeWidth: '2.5', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      case 'dashed': return { strokeDasharray: '6,6', strokeWidth: '1.5' };
      case 'arrow': return { strokeDasharray: '0', strokeWidth: '1.5', markerEnd: `url(#arrow-${color.replace('#', '')})` };
      default: return { strokeDasharray: '0', strokeWidth: '1.5' };
    }
  };

  const getPathD = (path: DrawingPath) => {
    if (!path.points || path.points.length < 2) return '';
    const pointsPx = path.points.map(p => ({
      x: (p.x / 100) * pitchW,
      y: (p.y / 100) * pitchH
    }));

    if (path.type === 'dribble') {
      return getWavyPath(pointsPx, 5, 10);
    }
    return getSmoothBezierPath(pointsPx);
  };

  return (
    <div 
      className={`absolute inset-0 flex items-center justify-center z-0 overflow-hidden bg-[#0f5132] py-6 ${isFullscreen ? 'px-4' : 'pl-[360px] pr-[260px]'}`}
      ref={containerRef}
    >
      <div 
        ref={boardRef}
        className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#15803d] touch-none shrink-0"
        style={{ width: pitchSize.width, height: pitchSize.height }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const playerDataStr = e.dataTransfer.getData('application/json');
          if (playerDataStr && containerRef.current) {
            try {
              const player = JSON.parse(playerDataStr);
              const innerBoard = containerRef.current.firstElementChild;
              if (innerBoard) {
                const rect = innerBoard.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                manager.addPlayer('home', String(player.number), player.id, { x, y }, player.color, player.name);
              }
            } catch (err) {}
          }
        }}
      >
        <SVGGlobals />
        <PitchLines />
        <TacticalLanes overlayType={boardState.laneOverlay || 'none'} />

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible" viewBox={`0 0 ${pitchW} ${pitchH}`}>
          <defs>
            {COLORS.map(c => (
              <g key={`markers-${c}`}>
                <marker id={`arrow-${c.replace('#', '')}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill={c} />
                </marker>
              </g>
            ))}
            <filter id="tactical-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

          </defs>

          {/* Current Drawing Path */}
          {currentPathPoints.length > 0 && boardState.currentPathType && (
            <path
              d={getPathD({ id: 'current', type: boardState.currentPathType, points: currentPathPoints, color: boardState.drawingColor })}
              fill="none"
              stroke={boardState.drawingColor}
              style={getPathStyles(boardState.currentPathType, boardState.drawingColor)}
            />
          )}

          {/* Saved Paths */}
          {boardState.paths.map(path => (
            <path
              key={path.id}
              d={getPathD(path)}
              fill="none"
              stroke={path.color}
              style={getPathStyles(path.type, path.color)}
            />
          ))}

          {/* Geometric Shapes */}
          {boardState.shapes?.map(shape => (
            <GeometricShapeItem 
              key={shape.id} 
              shape={shape} 
              isSelected={boardState.selectedShapeId === shape.id}
              onPointerDown={(e) => {
                if (boardState.currentTool === 'pointer') {
                  setBoardState(prev => ({ ...prev, selectedShapeId: shape.id, selectedTokenId: null }));
                }
              }}
              onResizeStart={(e, idx) => {
                resizingShapeId.current = shape.id;
                resizingHandleIdx.current = idx;
              }}
            />
          ))}

          {/* Draft Shape */}
          {draftShape && (
            <GeometricShapeItem 
              shape={draftShape} 
              isSelected={false}
              onPointerDown={() => {}}
              onResizeStart={() => {}}
            />
          )}
        </svg>

        {/* Tokens */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {boardState.tokens.map(token => (
            <BoardTokenItem 
              key={token.id} 
              token={token} 
              isSelected={boardState.selectedTokenId === token.id} 
              isAnimating={isPlaying}
              onPointerDown={handleTokenPointerDown}
              onRotateStart={manager.handleRotateStart}
              onScaleStart={manager.handleScaleStart}
              onDelete={manager.deleteSelectedToken}
            />
          ))}
        </div>

        {/* MENÚ CONTEXTUAL DEL TOKEN (Ahora con posiciones relativas al canvas correctas) */}
        {boardState.selectedTokenId && (
          <ContextualTokenMenu 
            token={boardState.tokens.find(t => t.id === boardState.selectedTokenId)!}
            onDuplicate={manager.duplicateToken}
            onDelete={manager.deleteSelectedToken}
            onColorChange={boardState.tokens.find(t => t.id === boardState.selectedTokenId)?.type === 'player' ? () => onEditToken?.(boardState.selectedTokenId!) : undefined}
          />
        )}
      </div>
    </div>
  );
}
