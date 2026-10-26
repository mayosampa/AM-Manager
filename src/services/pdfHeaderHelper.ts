import jsPDF from 'jspdf';
import { cacheService } from './cacheService';
import { Team } from '../types';

export interface UnifiedPdfHeaderOptions {
  teamName: string;
  teamShield?: string;
  reportTitle: string;
  subtitle?: string;
  dateStr?: string;
  heightMm?: number;
}

/**
 * Busca el escudo configurado para el equipo en la caché local (SettingsScreen -> crestUrl)
 * si no se ha pasado explícitamente en `teamShield`.
 */
export function getCachedTeamShield(teamName?: string, explicitShield?: string): string | undefined {
  if (explicitShield && explicitShield.trim()) return explicitShield.trim();
  try {
    const teams = cacheService.get<Team[]>('teams', []);
    const matched =
      (teamName ? teams.find(t => t.name.toLowerCase() === teamName.toLowerCase()) : undefined) ||
      teams[0];
    if (matched) {
      const settings = cacheService.get<{ crestUrl?: string } | null>(
        `app_state_settings_${matched.id}`,
        null
      );
      if (settings?.crestUrl && settings.crestUrl.trim()) {
        return settings.crestUrl.trim();
      }
      const anyTeam = matched as Team & { shield?: string; crestUrl?: string };
      if (anyTeam.shield) return anyTeam.shield;
      if (anyTeam.crestUrl) return anyTeam.crestUrl;
    }
  } catch {
    // ignore storage errors
  }
  return undefined;
}

/**
 * Convierte cualquier URL o DataURL de escudo (PNG, JPEG, SVG, WebP o ruta local)
 * a un DataURL PNG listo para `doc.addImage(..., 'PNG', ...)` en jsPDF.
 */
export async function resolveShieldDataUrl(
  teamShield?: string,
  teamName?: string
): Promise<string | undefined> {
  const source = getCachedTeamShield(teamName, teamShield) || '/logo.png';
  if (!source) return undefined;

  if (source.startsWith('data:image/png') || source.startsWith('data:image/jpeg')) {
    return source;
  }

  return new Promise<string | undefined>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 240;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(undefined);
            return;
          }
          const scale = Math.min(size / (img.width || size), size / (img.height || size));
          const w = (img.width || size) * scale;
          const h = (img.height || size) * scale;
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(undefined);
        }
      };
      img.onerror = () => resolve(undefined);
      img.src = source;
    } catch {
      resolve(undefined);
    }
  });
}

/**
 * Dibuja la cabecera institucional unificada en todos los informes PDF de AM Manager:
 * - Barra superior oscura (#111214) con acento carmesí/rojo del club.
 * - Izquierda: Escudo del Equipo (teamShield) en alta nitidez (18x18mm).
 * - Junto al escudo: Categoría del documento en mayúsculas (reportTitle), Nombre del Equipo en grande y subtítulo/fecha.
 * - Derecha: Sello discreto de AM MANAGER y fecha del informe.
 *
 * Devuelve la coordenada Y (en mm) donde termina la cabecera para continuar el contenido.
 */
export function drawUnifiedPdfHeader(doc: jsPDF, options: UnifiedPdfHeaderOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerH = options.heightMm ?? 30;

  // Fondo institucional oscuro (#111214)
  doc.setFillColor(17, 18, 20);
  doc.rect(0, 0, pageWidth, headerH, 'F');

  // Línea de acento superior e inferior carmesí/rojo (#E11D48)
  doc.setFillColor(225, 29, 72);
  doc.rect(0, headerH - 1.2, pageWidth, 1.2, 'F');

  // Marco para el escudo a la izquierda (18x18mm)
  const shieldSize = 18;
  const shieldX = 12;
  const shieldY = (headerH - 1.2 - shieldSize) / 2;

  doc.setFillColor(26, 28, 32);
  doc.setDrawColor(55, 60, 70);
  doc.setLineWidth(0.35);
  doc.roundedRect(shieldX - 1, shieldY - 1, shieldSize + 2, shieldSize + 2, 2.5, 2.5, 'FD');

  const resolvedShield = getCachedTeamShield(options.teamName, options.teamShield);
  let shieldDrawn = false;

  if (resolvedShield && resolvedShield.startsWith('data:image/')) {
    try {
      const format = resolvedShield.includes('image/jpeg') || resolvedShield.includes('image/jpg')
        ? 'JPEG'
        : 'PNG';
      doc.addImage(resolvedShield, format, shieldX, shieldY, shieldSize, shieldSize);
      shieldDrawn = true;
    } catch {
      shieldDrawn = false;
    }
  }

  if (!shieldDrawn) {
    // Fallback elegante con iniciales del club
    const initials = (options.teamName || 'AM')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('') || 'AM';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(225, 29, 72);
    doc.text(initials, shieldX + shieldSize / 2, shieldY + shieldSize / 2 + 1.5, {
      align: 'center',
    });
  }

  // Bloque central-izquierdo junto al escudo
  const textX = shieldX + shieldSize + 6;

  // Categoría del documento en mayúsculas (ej. INFORME DE PARTIDO, PLANTILLA OFICIAL...)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(244, 63, 94); // Rose-500
  doc.text((options.reportTitle || 'INFORME OFICIAL').toUpperCase(), textX, 9.5);

  // Nombre del Equipo en grande
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  const cleanTeamName = (options.teamName || 'Equipo').toUpperCase();
  doc.text(cleanTeamName, textX, 17);

  // Subtítulo (rival, marcador, rango de fechas, etc.)
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 190, 200);
    doc.text(options.subtitle, textX, 23.5);
  }

  // Derecha: Sello discreto AM MANAGER + Fecha
  const rightX = pageWidth - 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('AM MANAGER · PRO SUITE', rightX, 10.5, { align: 'right' });

  const dateLabel =
    options.dateStr ||
    new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(dateLabel, rightX, 17, { align: 'right' });

  return headerH;
}
