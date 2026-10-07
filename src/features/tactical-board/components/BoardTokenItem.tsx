import React, { memo } from 'react';
import { BoardToken } from '../../../types';
import { TokenPlayer, TokenBall, TokenCone, TokenPole, TokenGoal, TokenLadder, TokenRing, TokenHurdleHigh, TokenHurdleLow, TokenDummy, TokenPoleGround, TokenFlatCone, TokenMedicineBall } from './TokenSVGs';
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
}

export const BoardTokenItem = memo(({ token, isSelected, isAnimating = false, onPointerDown, onRotateStart, onScaleStart, onDelete }: Props) => {
  const transitionClass = isAnimating ? 'transition-all duration-[1500ms] ease-in-out' : '';
  const scale = token.scale || 1;

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
      default: {
        const isHome = token.team === 'home';
        const color = token.color ? token.color : (isHome ? '#f43f5e' : '#3b82f6');
        return <TokenPlayer color={color} label={token.label || ''} playerName={token.playerName} />;
      }
    }
  };

  const getBoxSize = () => MATERIAL_BASE_SIZES[token.type] || { w: 32, h: 32 };

  const box = getBoxSize();

  return (
    <div
      id={`token-${token.id}`}
      className={`absolute z-10 touch-none select-none cursor-grab active:cursor-grabbing origin-center group pointer-events-auto ${transitionClass}`}
      style={{ left: `${token.position.x}%`, top: `${token.position.y}%`, transform: `rotate(${token.rotation || 0}deg) scale(${scale})` }}
      data-rotation={token.rotation || 0}
      data-scale={scale}
      onPointerDown={(e) => onPointerDown(e, token.id)}
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
                    // We route all corner scaling to the same handler for now
                    if (onScaleStart) onScaleStart(e, token.id);
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
});



