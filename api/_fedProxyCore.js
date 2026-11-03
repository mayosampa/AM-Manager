/**
 * Núcleo del proxy de lectura de páginas públicas de competición.
 *
 * Lo comparten la función serverless de Vercel (`api/fed-proxy.js`) y el middleware
 * de desarrollo de Vite (`vite.config.ts`). Los archivos con prefijo `_` en `/api`
 * no se publican como endpoint en Vercel.
 *
 * Seguridad: NO es un proxy abierto. Solo permite GET por HTTPS a las páginas públicas
 * de consulta de competición (jornada, calendario, clasificación, equipo y login de sesión pública)
 * de la plataforma federativa, bloquea hosts locales/privados y limita tamaño y tiempo.
 */

const ALLOWED_PAGE = /^\/pnfg\/(NPcd\/NFG_(VisCalendario_Vis|CmpJornada|VisClasificacion|CmpClasificacion|VisEquipos|LstEquipos)|NLogin)$/i;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$)/i;
const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 14000;

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
  const lowerSearch = url.search.toLowerCase();
  const isTeamPage = /nfg_visequipos/i.test(url.pathname);
  if (isTeamPage && !lowerSearch.includes('codigo_equipo=') && !lowerSearch.includes('codequipo=')) {
    throw new FedProxyError(
      'El enlace de equipo está incompleto (falta Codigo_Equipo). Pega el enlace completo de la jornada o del equipo.'
    );
  }
  if (!isTeamPage && (!lowerSearch.includes('codcompeticion=') || !lowerSearch.includes('codgrupo='))) {
    throw new FedProxyError(
      'El enlace está cortado o incompleto (faltan CodCompeticion y CodGrupo). Copia y pega la dirección completa desde el navegador.'
    );
  }
  return url;
}

function detectCharset(contentType, bytes) {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType || '');
  if (fromHeader) return fromHeader[1].toLowerCase();
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 2048));
  const fromMeta = /charset=["']?([\w-]+)/i.exec(head);
  return fromMeta ? fromMeta[1].toLowerCase() : 'iso-8859-15';
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

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single ? single.split(/,(?=\s*[A-Za-z0-9_\-]+=)/) : [];
}

/**
 * Descarga la página validada manteniendo una jarra de cookies en memoria durante el apretón de manos
 * (`302 -> /pnfg/NLogin -> 302 -> NFG_...`) requerido por el servidor de competiciones para establecer `JSESSIONID`.
 */
export async function fetchFederationPage(raw) {
  const initialUrl = validateFederationUrl(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const cookieJar = new Map();
  const storeCookies = headers => {
    for (const sc of extractSetCookies(headers)) {
      const firstPart = String(sc || '').split(';')[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx > 0) {
        const k = firstPart.slice(0, eqIdx).trim();
        const v = firstPart.slice(eqIdx + 1).trim();
        if (k) cookieJar.set(k, v);
      }
    }
  };

  const buildHeaders = () => {
    const cookieStr = Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
      ...(cookieStr ? { Cookie: cookieStr } : {}),
    };
  };

  try {
    let currentUrl = initialUrl.toString();
    let finalResponse = null;

    for (let hop = 0; hop < 6; hop++) {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: buildHeaders(),
      });

      storeCookies(res.headers);

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) {
          finalResponse = res;
          break;
        }
        const nextUrl = new URL(loc, currentUrl);
        if (nextUrl.hostname !== initialUrl.hostname) {
          throw new FedProxyError('La página redirigió a un dominio externo no permitido.', 502);
        }
        currentUrl = nextUrl.toString();
        continue;
      }

      finalResponse = res;
      break;
    }

    if (!finalResponse) {
      throw new FedProxyError('Demasiadas redirecciones al conectar con la web de la competición.', 502);
    }

    if (!finalResponse.ok) {
      throw new FedProxyError(`La web de la competición respondió con estado ${finalResponse.status}.`, 502);
    }

    let bytes = new Uint8Array(await finalResponse.arrayBuffer());
    let decoded = decodeBytes(bytes, detectCharset(finalResponse.headers.get('content-type'), bytes));

    // Si tras pasar por NLogin devolvió aviso de cookie o respuesta vacía, reintentar una vez con la cookie ya fijada
    if ((bytes.byteLength < 250 || decoded.includes('No se ha aceptado el cookie')) && cookieJar.size > 0) {
      const retryRes = await fetch(initialUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: buildHeaders(),
      });
      if (retryRes.ok) {
        bytes = new Uint8Array(await retryRes.arrayBuffer());
        decoded = decodeBytes(bytes, detectCharset(retryRes.headers.get('content-type'), bytes));
      }
    }

    if (bytes.byteLength > MAX_BYTES) {
      throw new FedProxyError('La página es demasiado grande.', 502);
    }
    if (bytes.byteLength === 0 || decoded.includes('No se ha aceptado el cookie')) {
      throw new FedProxyError(
        'La página llegó vacía o incompleta. Comprueba que el enlace esté completo (con CodCompeticion y CodGrupo).',
        502
      );
    }

    return decoded;
  } catch (err) {
    if (err instanceof FedProxyError) throw err;
    throw new FedProxyError('La web de la competición no respondió a tiempo.', 504);
  } finally {
    clearTimeout(timer);
  }
}
