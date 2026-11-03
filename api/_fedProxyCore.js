/**
 * Núcleo del proxy de lectura de páginas públicas de competición.
 *
 * Lo comparten la función serverless de Vercel (`api/fed-proxy.js`) y el middleware
 * de desarrollo de Vite (`vite.config.ts`). Los archivos con prefijo `_` en `/api`
 * no se publican como endpoint en Vercel.
 *
 * Seguridad: NO es un proxy abierto. Solo permite GET por HTTPS a las páginas públicas
 * de consulta de competición (jornada, calendario, clasificación y ficha de equipo)
 * de la plataforma de gestión federativa, bloquea hosts locales/privados y limita tamaño
 * y tiempo de respuesta.
 */

const ALLOWED_PAGE = /^\/pnfg\/NPcd\/NFG_(VisCalendario_Vis|CmpJornada|VisClasificacion|CmpClasificacion|VisEquipos)$/i;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$)/i;
const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 12000;

export class FedProxyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateFederationUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new FedProxyError('El enlace no es una URL válida.');
  }
  if (url.protocol !== 'https:') {
    throw new FedProxyError('Solo se admiten enlaces https://');
  }
  if (PRIVATE_HOST.test(url.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || !url.hostname.includes('.')) {
    throw new FedProxyError('Host no permitido.');
  }
  if (!ALLOWED_PAGE.test(url.pathname)) {
    throw new FedProxyError(
      'Este enlace no es una página pública de competición compatible (jornada, calendario, clasificación o equipo).'
    );
  }
  return url;
}

function detectCharset(contentType, bytes) {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType || '');
  if (fromHeader) return fromHeader[1].toLowerCase();
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 2048));
  const fromMeta = /charset=["']?([\w-]+)/i.exec(head);
  return fromMeta ? fromMeta[1].toLowerCase() : 'utf-8';
}

function decodeBytes(bytes, charset) {
  const candidates = [charset, charset.startsWith('iso-8859') ? 'latin1' : 'utf-8', 'latin1'];
  for (const enc of candidates) {
    try {
      return new TextDecoder(enc).decode(bytes);
    } catch {
      // probar siguiente codificación
    }
  }
  return new TextDecoder().decode(bytes);
}

/** Descarga la página validada y devuelve su HTML ya convertido a texto Unicode. */
export async function fetchFederationPage(raw) {
  const url = validateFederationUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AMManager/1.0; +https://am-manager.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    });
  } catch {
    throw new FedProxyError('La web de la competición no respondió a tiempo.', 504);
  } finally {
    clearTimeout(timer);
  }

  if (response.url && new URL(response.url).hostname !== url.hostname) {
    throw new FedProxyError('La página redirigió a un dominio distinto.', 502);
  }
  if (!response.ok) {
    throw new FedProxyError(`La web de la competición respondió con estado ${response.status}.`, 502);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    throw new FedProxyError('La página es demasiado grande.', 502);
  }
  if (bytes.byteLength === 0) {
    throw new FedProxyError(
      'La página llegó vacía. Abre el enlace en el navegador, comprueba que muestra datos y vuelve a copiarlo.',
      502
    );
  }

  return decodeBytes(bytes, detectCharset(response.headers.get('content-type'), bytes));
}
