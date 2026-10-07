import React, { useCallback } from 'react';
import { PitchLines } from './PitchLines';
import { TacticalLanes } from './TacticalLanes';
import { BoardTokenItem } from './BoardTokenItem';
import { SVGGlobals } from './TokenSVGs';
import { GeometricShapeItem } from './GeometricShapeItem';
import { PathsLayer } from './PathsLayer';
import { ContextualTokenMenu } from './ContextualTokenMenu';
import { useBoardManager } from '../controllers/useBoardManager';
import { useElementSize } from '../controllers/useElementSize';
import { useShapeTool } from '../controllers/useShapeTool';

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

export function TacticalCanvas({ manager, pitchSize, containerRef, onEditToken, isFullscreen }: Props) {
  const { 
    boardRef, boardState, setBoardState, isPlaying, 
    handleBoardPointerDown, handleBoardPointerMove, 
    handleBoardPointerUp, handleTokenPointerDown,
    livePathRef, liveHeadRef, captureBoardRect, getRelativePosition
  } = manager;

  const size = useElementSize(boardRef);

  const shapeTool = useShapeTool({
    boardState,
    setBoardState,
    getRelativePosition,
    captureBoardRect
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!shapeTool.onPointerDown(e)) {
      handleBoardPointerDown(e);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!shapeTool.onPointerMove(e)) {
      handleBoardPointerMove(e);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    shapeTool.onPointerUp();
    handleBoardPointerUp(e);
  };
  
  const onDoubleClick = (e: React.MouseEvent) => {
    shapeTool.onDoubleClick();
  };

  const pitchW = size.width || parseFloat(pitchSize.width) || 100;
  const pitchH = size.height || parseFloat(pitchSize.height) || 100;

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
          </defs>

          <PathsLayer 
            paths={boardState.paths} 
            width={pitchW} 
            height={pitchH} 
            liveColor={boardState.drawingColor}
            liveType={boardState.currentPathType || 'arrow'}
            livePathRef={livePathRef}
            liveHeadRef={liveHeadRef}
          />

          {/* Geometric Shapes */}
          {boardState.shapes?.map(shape => (
            <GeometricShapeItem 
              key={shape.id} 
              shape={shape} 
              width={pitchW}
              height={pitchH}
              isSelected={boardState.selectedShapeId === shape.id}
              onSelect={(e) => {
                if (boardState.currentTool === 'pointer') {
                  setBoardState(prev => ({ ...prev, selectedShapeId: shape.id, selectedTokenId: null }));
                }
              }}
              onResizeStart={(e, idx) => shapeTool.startResize(e, shape, idx)}
            />
          ))}

          {/* Draft Shape */}
          {shapeTool.preview && (
            <GeometricShapeItem 
              shape={shapeTool.preview.shape} 
              width={pitchW}
              height={pitchH}
              isSelected={false}
              onSelect={() => {}}
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

        {/* MENÚ CONTEXTUAL DEL TOKEN */}
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
