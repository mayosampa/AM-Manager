import React, { memo, useState } from 'react';
import { BoardToken } from '../../../types';
import { TokenPlayer, TokenBall, TokenCone, TokenPole, TokenGoal, TokenLadder, TokenRing, TokenHurdleHigh, TokenHurdleLow, TokenDummy, TokenPoleGround, TokenFlatCone, TokenMedicineBall, TokenBench, TokenDumbbell } from './TokenSVGs';
import { TextBoxToken } from './TextBoxToken';
import { MATERIAL_BASE_SIZES } from '../constants';

interface Props {
  key?: React.Key;
  token: BoardToken;
  isSelected: boolean;
  isAnimating?: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onRotateStart?: (e: React.PointerEvent, id: string) => void;
  onScaleStart?: (e: React.PointerEvent, id: string) => void;
  onDelete?: (id: string) => void;
  onUpdateToken?: (id: string, updates: Partial<BoardToken>) => void;
  onEditToken?: (id: string) => void;
}

export const BoardTokenItem = memo(({ 
  token, 
  isSelected, 
  isAnimating = false, 
  onPointerDown, 
  onRotateStart, 
  onScaleStart,
  onUpdateToken,
  onEditToken,
}: Props) => {
  const transitionClass = isAnimating ? 'transition-all duration-[1500ms] ease-in-out' : '';
  const scale = token.scale || 1;

  const [isEditingText, setIsEditingText] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(48);
  const [dynamicWidth, setDynamicWidth] = useState<number | undefined>(undefined);

  const handleWidthResize = (e: React.PointerEvent, side: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = token.width || 220;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    let currentW = startWidth;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const factor = side === 'right' ? 2 : -2;
      currentW = Math.max(140, Math.min(600, Math.round(startWidth + deltaX * factor)));
      setDynamicWidth(currentW);
    };

    const onPointerUp = (upEv: PointerEvent) => {
      try { target.releasePointerCapture(upEv.pointerId); } catch (_) {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setDynamicWidth(undefined);
      if (onUpdateToken) {
        onUpdateToken(token.id, { width: currentW });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const renderContent = () => {
    switch (token.type) {
      case 'cone': return <TokenCone />;
      case 'flat-cone': return <TokenFlatCone />;
      case 'pole': return <TokenPole />;
      case 'pole-ground': return <TokenPoleGround />;
      case 'goal': return <TokenGoal />;
      case 'ladder': return <TokenLadder />;
      case 'ring': return <TokenRing />;
      case 'hurdle-high': return <TokenHurdleHigh />;
      case 'hurdle-low': return <TokenHurdleLow />;
      case 'dummy': return <TokenDummy />;
      case 'ball': return <TokenBall />;
      case 'medicine-ball': return <TokenMedicineBall />;
      case 'bench': return <TokenBench />;
      case 'dumbbell': return <TokenDumbbell />;
      case 'text':
        return (
          <TextBoxToken
            token={token}
            isSelected={isSelected}
            isEditing={isEditingText}
            dynamicWidth={dynamicWidth}
            onStartEdit={() => setIsEditingText(true)}
            onSaveEdit={(newText) => {
              setIsEditingText(false);
              if (onUpdateToken) {
                onUpdateToken(token.id, { label: newText });
              }
            }}
            onHeightChange={(h) => {
              if (h > 0 && Math.abs(h - measuredHeight) > 2) {
                setMeasuredHeight(h);
              }
            }}
          />
        );
      default: {
        const isHome = token.team === 'home';
        const defaultColor = isHome ? '#ef4444' : '#3b82f6';
        // Si es jugador local y su color residual era azul (#3b82f6), asegurar que salga en rojo (#ef4444)
        const color = (token.color && (token.color !== '#3b82f6' || !isHome)) ? token.color : defaultColor;
        return <TokenPlayer color={color} label={token.label || ''} playerName={token.playerName} />;
      }
    }
  };

  const getBoxSize = () => {
    if (token.type === 'text') {
      const w = dynamicWidth || token.width || 220;
      return { w, h: measuredHeight };
    }
    return MATERIAL_BASE_SIZES[token.type] || { w: 32, h: 32 };
  };

  const box = getBoxSize();

  return (
    <div
      id={`token-${token.id}`}
      className={`absolute z-10 touch-none select-none cursor-grab active:cursor-grabbing origin-center group pointer-events-auto ${transitionClass}`}
      style={{ left: `${token.position.x}%`, top: `${token.position.y}%`, transform: `rotate(${token.rotation || 0}deg) scale(${scale})` }}
      data-rotation={token.rotation || 0}
      data-scale={scale}
      onPointerDown={(e) => onPointerDown(e, token.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEditToken?.(token.id);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEditToken?.(token.id);
      }}
    >
      <div id={`token-inner-${token.id}`} className="relative flex items-center justify-center w-0 h-0">
        {renderContent()}

        {/* Selected Bounding Box & Transformation Controls */}
        <div 
          data-export-exclude="true"
          className={`absolute border border-[rgba(255,255,255,0.5)] pointer-events-none transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ width: box.w + 16, height: box.h + 16, top: 0, left: 0, transform: `translate(-50%, -50%)` }}
        >
          {isSelected && (
            <>
              {/* Top Rotation Handle (Figma Style) */}
              <div className="absolute -top-6 left-1/2 w-px h-6 bg-[rgba(255,255,255,0.5)] pointer-events-none" />
              <div 
                className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 pointer-events-auto cursor-crosshair flex items-center justify-center group/rotate"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (onRotateStart) onRotateStart(e, token.id);
                }}
              >
                <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_2px_rgba(0,0,0,0.5)] transition-transform group-hover/rotate:scale-125" />
              </div>

              {/* Corner Scale Handles (Figma Style) */}
              {[
                { style: { top: 0, left: 0, transform: 'translate(-50%, -50%)' }, cursor: 'cursor-nwse-resize' },
                { style: { top: 0, right: 0, transform: 'translate(50%, -50%)' }, cursor: 'cursor-nesw-resize' },
                { style: { bottom: 0, left: 0, transform: 'translate(-50%, 50%)' }, cursor: 'cursor-nesw-resize' },
                { style: { bottom: 0, right: 0, transform: 'translate(50%, 50%)' }, cursor: 'cursor-nwse-resize', isMain: true }
              ].map((handle, i) => (
                <div 
                  key={i}
                  className={`absolute w-3 h-3 bg-white border border-gray-400 pointer-events-auto ${handle.cursor} z-20 shadow-[0_0_2px_rgba(0,0,0,0.5)] hover:scale-125 transition-transform`}
                  style={handle.style}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (onScaleStart) onScaleStart(e, token.id);
                  }}
                />
              ))}

              {/* Left & Right Width Handles (PowerPoint Style for Text Box) */}
              {token.type === 'text' && (
                <>
                  <div 
                    className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3.5 h-6 bg-white border border-gray-400 rounded-sm pointer-events-auto cursor-ew-resize z-20 shadow-md hover:bg-emerald-400 transition-colors flex items-center justify-center group/hwidth"
                    title="Arrastrar para ajustar ancho del cuadro"
                    onPointerDown={(e) => handleWidthResize(e, 'left')}
                  >
                    <div className="w-0.5 h-3 bg-gray-400 group-hover/hwidth:bg-black transition-colors" />
                  </div>
                  <div 
                    className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3.5 h-6 bg-white border border-gray-400 rounded-sm pointer-events-auto cursor-ew-resize z-20 shadow-md hover:bg-emerald-400 transition-colors flex items-center justify-center group/hwidth"
                    title="Arrastrar para ajustar ancho del cuadro"
                    onPointerDown={(e) => handleWidthResize(e, 'right')}
                  >
                    <div className="w-0.5 h-3 bg-gray-400 group-hover/hwidth:bg-black transition-colors" />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
