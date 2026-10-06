import React from 'react';
import { LaneOverlayType } from '../../../types';

interface Props {
  overlayType: LaneOverlayType;
}

export function TacticalLanes({ overlayType }: Props) {
  if (overlayType === 'none') return null;

  const lineStyle = { stroke: 'rgba(255, 255, 255, 0.6)', strokeWidth: 0.5, filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' };
  const thickLineStyle = { stroke: 'rgba(255, 255, 255, 0.8)', strokeWidth: 0.8, filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.9))' };

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        
        {/* 5 LANES (Pasillos longitudinales: Bandas, Pasillos Interiores, Centro) */}
        {overlayType === '5-lanes' && (
          <>
            <rect x="0" y="15" width="100" height="20" fill="rgba(0,0,0,0.15)" /> {/* Half-space top */}
            <rect x="0" y="65" width="100" height="20" fill="rgba(0,0,0,0.15)" /> {/* Half-space bottom */}
            
            <line x1="0" y1="15" x2="100" y2="15" {...thickLineStyle} strokeDasharray="2,2" />
            <line x1="0" y1="35" x2="100" y2="35" {...thickLineStyle} strokeDasharray="2,2" />
            <line x1="0" y1="65" x2="100" y2="65" {...thickLineStyle} strokeDasharray="2,2" />
            <line x1="0" y1="85" x2="100" y2="85" {...thickLineStyle} strokeDasharray="2,2" />
          </>
        )}
        
        {/* QUARTERS (4 sectores en profundidad) */}
        {overlayType === 'quarters' && (
          <>
            <line x1="25" y1="0" x2="25" y2="100" {...thickLineStyle} strokeDasharray="3,3" />
            <line x1="50" y1="0" x2="50" y2="100" {...thickLineStyle} strokeDasharray="3,3" />
            <line x1="75" y1="0" x2="75" y2="100" {...thickLineStyle} strokeDasharray="3,3" />
          </>
        )}

        {/* THIRDS (Iniciación, Creación, Finalización) */}
        {overlayType === 'thirds' && (
          <>
            <line x1="33.33" y1="0" x2="33.33" y2="100" {...thickLineStyle} />
            <line x1="66.66" y1="0" x2="66.66" y2="100" {...thickLineStyle} />
          </>
        )}

        {/* JUEGO DE POSICIÓN (20 zones: 5 pasillos x 4 sectores) */}
        {overlayType === 'position-play' && (
          <>
            {/* Sombreado de pasillos interiores */}
            <rect x="0" y="15" width="100" height="20" fill="rgba(0,0,0,0.15)" />
            <rect x="0" y="65" width="100" height="20" fill="rgba(0,0,0,0.15)" />
            
            {/* Líneas de profundidad (sectores) */}
            {[25, 50, 75].map(x => (
              <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="100" {...thickLineStyle} strokeDasharray="1.5,1.5" />
            ))}
            
            {/* Líneas longitudinales (pasillos) */}
            {[15, 35, 65, 85].map(y => (
              <line key={`y-${y}`} x1="0" y1={y} x2="100" y2={y} {...thickLineStyle} strokeDasharray="1.5,1.5" />
            ))}
          </>
        )}

        {/* ZONA 14 (Central rectangle just outside the penalty box) */}
        {overlayType === 'zone-14' && (
          <>
            {/* Assuming home team attacks right. Zona 14 is the center slot between 50% and 75% length, and 35% to 65% width */}
            <rect x="50" y="35" width="25" height="30" fill="rgba(234, 179, 8, 0.25)" stroke="#eab308" strokeWidth="1" filter="drop-shadow(0px 0px 4px rgba(234, 179, 8, 0.8))" />
            <text x="62.5" y="50" fill="rgba(255,255,255,0.7)" fontSize="4" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))">ZONA 14</text>
            
            {/* Lines dividing the pitch in thirds and lanes to give context */}
            <line x1="50" y1="0" x2="50" y2="100" {...lineStyle} strokeDasharray="2,2" />
            <line x1="75" y1="0" x2="75" y2="100" {...lineStyle} strokeDasharray="2,2" />
            <line x1="0" y1="35" x2="100" y2="35" {...lineStyle} strokeDasharray="2,2" />
            <line x1="0" y1="65" x2="100" y2="65" {...lineStyle} strokeDasharray="2,2" />
          </>
        )}

        {overlayType === 'grid-3x6' && (
          <>
            {/* Horizontal grid (y axis) */}
            {[16.6, 33.3, 50, 66.6, 83.3].map(y => (
              <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} {...lineStyle} strokeDasharray="2,2" />
            ))}
            {/* Vertical grid (x axis) */}
            {[33.3, 66.6].map(x => (
              <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="100" {...lineStyle} strokeDasharray="2,2" />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
