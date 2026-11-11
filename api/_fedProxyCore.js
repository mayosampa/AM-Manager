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
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$|\[?fe80:|\[?fc00:|\[?fd00:)/i;
const ALLOWED_HOSTS = new Set([
  'www.rfaf.es',
  'rfaf.es',
  'www.rffm.es',
  'rffm.es',
  'intranet.rffm.es',
  'www.fcf.cat',
  'fcf.cat',
  'www.ffcv.es',
  'ffcv.es',
  'resultadosffcv.isquad.es',
  'www.rfgf.es',
  'rfgf.es',
]);
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
  if (url.protocol !== 'https:' || url.port !== '') {
    throw new FedProxyError('Solo se admiten enlaces https:// en puerto estándar.');
  }
  const host = url.hostname.toLowerCase();
  if (
    PRIVATE_HOST.test(host) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    !host.includes('.') ||
    !ALLOWED_HOSTS.has(host)
  ) {
    throw new FedProxyError('Host de federación no permitido.');
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

function isValidCompetitionHtml(text) {
  if (!text || text.trim().length < 500) return false;
  if (text.includes('No se ha aceptado el cookie')) return false;
  return /<table|font_widgetL|anchogoles|Jugadores/i.test(text);
}

/**
 * Fallback mediante navegador headless (`r.jina.ai` con `X-Return-Format: html`) para cuando el servidor
 * de la competición bloquea las IPs de centros de datos cloud (AWS/Vercel) devolviendo `Content-Length: 0`.
 */
async function fetchViaHeadlessRelay(targetUrl, signal) {
  const relayUrl = `https://r.jina.ai/${targetUrl}`;
  const res = await fetch(relayUrl, {
    method: 'GET',
    signal,
    headers: {
      'X-Return-Format': 'html',
      Accept: 'text/html,application/xhtml+xml,*/*',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  });
  if (!res.ok) {
    throw new FedProxyError(`El relay devolvió estado ${res.status}.`, 502);
  }
  const html = await res.text();
  if (!isValidCompetitionHtml(html)) {
    throw new FedProxyError('La página devuelta por el relay no contiene tablas de competición.', 502);
  }
  return html;
}

/**
 * Descarga la página validada manteniendo una jarra de cookies en memoria durante el apretón de manos
 * (`302 -> /pnfg/NLogin -> 302 -> NFG_...`) y, si el firewall del servidor devuelve 0 bytes a la IP
 * serverless de Vercel (AWS), utiliza automáticamente el relay con navegador headless.
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
    let decoded = '';

    // 1. Intento directo con jarra de cookies (óptimo en entorno local / IPs residenciales)
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
          if (
            nextUrl.protocol !== 'https:' ||
            nextUrl.port !== '' ||
            nextUrl.hostname !== initialUrl.hostname ||
            !ALLOWED_PAGE.test(nextUrl.pathname)
          ) {
            break;
          }
          currentUrl = nextUrl.toString();
          continue;
        }

        finalResponse = res;
        break;
      }

      if (finalResponse && finalResponse.ok) {
        const declaredLen = Number(finalResponse.headers.get('content-length') || 0);
        if (declaredLen <= MAX_BYTES) {
          let bytes = new Uint8Array(await finalResponse.arrayBuffer());
          if (bytes.byteLength <= MAX_BYTES) {
            decoded = decodeBytes(bytes, detectCharset(finalResponse.headers.get('content-type'), bytes));
          }
        }

        if (!isValidCompetitionHtml(decoded) && cookieJar.size > 0) {
          const retryRes = await fetch(initialUrl.toString(), {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: buildHeaders(),
          });
          if (retryRes.ok) {
            bytes = new Uint8Array(await retryRes.arrayBuffer());
            if (bytes.byteLength <= MAX_BYTES) {
              decoded = decodeBytes(bytes, detectCharset(retryRes.headers.get('content-type'), bytes));
            }
          }
        }
      }
    } catch {
      // Si el servidor bloquea la IP de AWS/Vercel, pasamos al relay headless
    }

    if (isValidCompetitionHtml(decoded)) {
      return decoded;
    }

    // 2. Fallback automático mediante relay con navegador headless (salta el bloqueo de IP AWS en Vercel)
    return await fetchViaHeadlessRelay(initialUrl.toString(), controller.signal);
  } catch (err) {
    if (err instanceof FedProxyError) throw err;
    throw new FedProxyError('La web de la competición no respondió a tiempo.', 504);
  } finally {
    clearTimeout(timer);
  }
}
