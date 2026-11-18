/**
 * Utilidades de sanitización de URLs e imágenes para prevenir XSS, inyección de esquemas
 * peligrosos (`javascript:`, `vbscript:`, `data:text/html`, SVG con scripts inline) y tabnabbing.
 */

const SAFE_RASTER_DATA_URI = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const SAFE_RELATIVE_ASSET = /^\/[A-Za-z0-9._/-]+$/;

/**
 * Valida y sanea una fuente de imagen (escudo del club, avatar, etc.).
 * Permite rutas locales (`/am-logo.png`), Data URLs rasterizados en base64, o URLs `https://`.
 * Rechaza `javascript:`, `data:text/html`, `data:image/svg+xml` externos y URLs malformadas.
 */
export function sanitizeImageSrc(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (SAFE_RELATIVE_ASSET.test(trimmed)) return trimmed;
  if (SAFE_RASTER_DATA_URI.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Valida que un enlace externo sea `https://` válido (o localhost en desarrollo).
 */
export function sanitizeExternalHttpsUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') return parsed.toString();
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Abre una URL externa validada con protección `noopener,noreferrer` contra reverse tabnabbing.
 */
export function openSafeExternalUrl(rawUrl?: string | null): boolean {
  const safe = sanitizeExternalHttpsUrl(rawUrl);
  if (!safe || typeof window === 'undefined') return false;
  window.open(safe, '_blank', 'noopener,noreferrer');
  return true;
}
