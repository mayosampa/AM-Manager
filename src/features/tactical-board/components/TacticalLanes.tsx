import React from 'react';
import { LaneOverlayType } from '../../../types';

interface Props {
  overlayType: LaneOverlayType;
}

export function TacticalLanes({ overlayType }: Props) {
  if (overlayType === 'none') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 opacity-30">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {overlayType === '5-lanes' && (
          <>
            <line x1="15" y1="0" x2="15" y2="100" stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
            <line x1="35" y1="0" x2="35" y2="100" stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
            <line x1="65" y1="0" x2="65" y2="100" stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
            <line x1="85" y1="0" x2="85" y2="100" stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
          </>
        )}
        
        {overlayType === 'quarters' && (
          <>
            <line x1="0" y1="25" x2="100" y2="25" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2,2" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2,2" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#ffffff" strokeWidth="0.3" strokeDasharray="2,2" />
          </>
        )}

        {overlayType === 'grid-3x6' && (
          <>
            {/* Horizontal lines */}
            {[16.6, 33.3, 50, 66.6, 83.3].map(y => (
              <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
            ))}
            {/* Vertical lines */}
            <line x1="33.3" y1="0" x2="33.3" y2="100" stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
            <line x1="66.6" y1="0" x2="66.6" y2="100" stroke="#ffffff" strokeWidth="0.2" strokeDasharray="1,1" />
          </>
        )}
      </svg>
    </div>
  );
}
