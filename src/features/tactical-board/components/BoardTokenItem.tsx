import React, { memo } from 'react';
import { BoardToken } from '../../../types';
import { RotateCw, X, Maximize2 } from 'lucide-react';
import { TokenPlayer, TokenBall, TokenCone, TokenPole, TokenGoal, TokenLadder, TokenRing, TokenHurdle, TokenDummy, TokenPoleGround, TokenFlatCone, TokenMedicineBall } from './TokenSVGs';

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
      case 'hurdle': return <TokenHurdle />;
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

  const getBoxSize = () => {
    switch (token.type) {
      case 'ladder': return { w: 40, h: 128 };
      case 'goal': return { w: 90, h: 40 };
      case 'hurdle': return { w: 48, h: 32 };
      case 'dummy': return { w: 40, h: 48 };
      case 'pole': return { w: 24, h: 48 };
      case 'pole-ground': return { w: 64, h: 16 };
      case 'cone': return { w: 32, h: 32 };
      case 'flat-cone': return { w: 32, h: 32 };
      case 'ball': return { w: 24, h: 24 };
      case 'medicine-ball': return { w: 32, h: 32 };
      case 'ring': return { w: 40, h: 40 };
      default: return { w: 32, h: 32 };
    }
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
    >
      <div id={`token-inner-${token.id}`} className="relative flex items-center justify-center w-0 h-0">
        {renderContent()}

        {/* Selected Bounding Box & Transformation Controls */}
        <div 
          data-export-exclude="true"
          className={`absolute border border-dashed border-[#FF4B4B] pointer-events-none transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ width: box.w, height: box.h, transform: `translate(-50%, -50%)` }}
        >
          {/* Top Rotation Handle */}
          <div className="absolute -top-8 left-1/2 w-px h-8 bg-[#FF4B4B]" />
          <div 
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#121215] border-2 border-[#FF4B4B] rounded-full pointer-events-auto cursor-crosshair flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onRotateStart) onRotateStart(e, token.id);
            }}
          >
            <RotateCw className="w-4 h-4 text-[#FF4B4B]" />
          </div>

          {/* Bottom-Right Scale Handle */}
          <div 
            className="absolute -bottom-3 -right-3 w-7 h-7 bg-[#121215] border-2 border-[#FF4B4B] rounded-full pointer-events-auto cursor-se-resize flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onScaleStart) onScaleStart(e, token.id);
            }}
          >
            <Maximize2 className="w-3 h-3 text-[#FF4B4B]" />
          </div>

          {/* Delete Button */}
          <div 
            className="absolute -top-3 -right-3 w-6 h-6 bg-[#FF4B4B] border-2 border-[#121215] rounded-full pointer-events-auto cursor-pointer flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20"
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(token.id);
            }}
          >
            <X className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
});
