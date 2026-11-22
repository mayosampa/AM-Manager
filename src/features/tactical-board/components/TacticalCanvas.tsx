import React from 'react';
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

export function TacticalCanvas({ manager, pitchSize, containerRef, onEditToken }: Props) {
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
    captureBoardRect,
    onBeforeMutate: manager.pushHistorySnapshot,
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

  const onDoubleClick = () => {
    shapeTool.onDoubleClick();
  };

  const pitchW = size.width || parseFloat(pitchSize.width) || 100;
  const pitchH = size.height || parseFloat(pitchSize.height) || 100;
  const selectedToken = boardState.selectedTokenId
    ? boardState.tokens.find(t => t.id === boardState.selectedTokenId)
    : undefined;

  return (
    <div
      className="flex-1 min-h-0 min-w-0 h-full relative flex items-center justify-center bg-[#0f5132] p-2 sm:p-3 overflow-hidden select-none"
      ref={containerRef}
    >
      <div
        ref={boardRef}
        className="relative bg-[#15803d] ring-4 ring-[#15803d] rounded-xs shadow-md touch-none shrink-0"
        style={{ width: pitchSize.width, height: pitchSize.height, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const payloadStr = e.dataTransfer.getData('application/json');
          if (payloadStr && containerRef.current) {
            try {
              const payload = JSON.parse(payloadStr);
              const innerBoard = boardRef.current || containerRef.current.firstElementChild;
              if (innerBoard) {
                const rect = innerBoard.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                if (payload.tokenType) {
                  const id = manager.addToken(payload.tokenType);
                  manager.updateToken(id, { position: { x, y } });
                } else {
                  const safeColor = payload.color && payload.color !== '#3b82f6' ? payload.color : '#ef4444';
                  manager.addPlayer('home', String(payload.number), payload.id, { x, y }, safeColor, payload.name);
                }
              }
            } catch {
              // ignore malformed drop payload
            }
          }
        }}
      >
        <SVGGlobals />
        <PitchLines />
        <TacticalLanes overlayType={boardState.laneOverlay || 'none'} />

        {/* Capa SVG Vectorial (Zonas Geométricas + Flechas) — contenedor pointer-events-none */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
          viewBox={`0 0 ${pitchW} ${pitchH}`}
        >
          <defs>
            {COLORS.map(c => (
              <g key={`markers-${c}`}>
                <marker id={`arrow-${c.replace('#', '')}`} markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 L 3 5 Z" fill={c} />
                </marker>
              </g>
            ))}
          </defs>

          {/* Geometric Shapes (render before arrows so arrows over zones remain clickable) */}
          {boardState.shapes?.map(shape => {
            const activeShape =
              shapeTool.preview &&
              (shapeTool.preview.mode === 'move' || shapeTool.preview.mode === 'resize') &&
              shapeTool.preview.shape.id === shape.id
                ? shapeTool.preview.shape
                : shape;

            return (
              <GeometricShapeItem
                key={shape.id}
                shape={activeShape}
                width={pitchW}
                height={pitchH}
                currentTool={boardState.currentTool}
                isSelected={boardState.selectedShapeId === shape.id}
                onMoveStart={(e, s) => shapeTool.startMove(e, s)}
                onResizeStart={(e, s, idx) => shapeTool.startResize(e, s, idx)}
                onDelete={manager.deleteSelectedShape}
              />
            );
          })}

          {/* Draft Shape while drawing */}
          {shapeTool.preview && shapeTool.preview.mode === 'draft' && (
            <GeometricShapeItem
              shape={shapeTool.preview.shape}
              width={pitchW}
              height={pitchH}
              isSelected={false}
            />
          )}

          <PathsLayer
            paths={boardState.paths}
            width={pitchW}
            height={pitchH}
            liveColor={boardState.drawingColor}
            liveType={boardState.currentPathType || 'arrow'}
            livePathRef={livePathRef}
            liveHeadRef={liveHeadRef}
            currentTool={boardState.currentTool}
            selectedPathId={boardState.selectedPathId}
            onSelectPath={manager.selectPath}
            onDeletePath={manager.deletePath}
            onEditPathStart={manager.handlePathEditStart}
          />
        </svg>

        {/* Capa de Fichas, Material y Notas Tácticas — contenedor pointer-events-none */}
        <div className="absolute inset-0 pointer-events-none z-20">
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
              onUpdateToken={manager.updateToken}
              onEditToken={onEditToken}
            />
          ))}
        </div>

        {/* MENÚ CONTEXTUAL DEL TOKEN SELECCIONADO */}
        {selectedToken && (
          <ContextualTokenMenu
            token={selectedToken}
            onDuplicate={manager.duplicateToken}
            onDelete={manager.deleteSelectedToken}
            onEdit={() => onEditToken?.(selectedToken.id)}
            onColorChange={
              ['player', 'text'].includes(selectedToken.type)
                ? () => onEditToken?.(selectedToken.id)
                : undefined
            }
            onScaleDelta={(delta) => manager.scaleSelectedToken(delta, selectedToken.id)}
          />
        )}
      </div>
    </div>
  );
}
