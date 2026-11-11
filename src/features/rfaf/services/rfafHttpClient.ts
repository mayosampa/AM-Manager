export interface FederationUrlParams {
  origin: string;
  pathname: string;
  codCompeticion?: string;
  codGrupo?: string;
  codTemporada?: string;
  codJornada?: string;
  codigoEquipo?: string;
}

/**
 * Extrae los parámetros clave de cualquier URL de competición federativa (NFG_CmpJornada, NFG_VisCalendario_Vis, NFG_VisClasificacion, NFG_VisEquipos).
 */
export function extractFederationUrlParams(rawUrl: string): FederationUrlParams | null {
  try {
    const parsed = new URL((rawUrl || '').trim());
    const getParam = (...keys: string[]): string | undefined => {
      for (const [k, v] of parsed.searchParams.entries()) {
        if (keys.some(target => target.toLowerCase() === k.toLowerCase()) && v && v.trim()) {
          return v.trim();
        }
      }
      return undefined;
    };

    return {
      origin: parsed.origin,
      pathname: parsed.pathname,
      codCompeticion: getParam('CodCompeticion', 'codcompeticion'),
      codGrupo: getParam('CodGrupo', 'codgrupo'),
      codTemporada: getParam('CodTemporada', 'codtemporada'),
      codJornada: getParam('CodJornada', 'codjornada') || '1',
      codigoEquipo: getParam('Codigo_Equipo', 'codigo_equipo', 'codequipo', 'CodEquipo'),
    };
  } catch {
    return null;
  }
}

/**
 * A partir de cualquier enlace de la competición (ej. NFG_CmpJornada), construye el enlace al calendario completo de la temporada (NFG_VisCalendario_Vis).
 */
export function resolveCalendarUrl(rawUrl: string): string {
  const params = extractFederationUrlParams(rawUrl);
  if (params && params.codCompeticion && params.codGrupo && params.codTemporada) {
    return `${params.origin}/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=${params.codTemporada}&codcompeticion=${params.codCompeticion}&codgrupo=${params.codGrupo}&CodJornada=${params.codJornada || '1'}`;
  }
  return (rawUrl || '').trim();
}

/**
 * A partir de cualquier enlace de la competición (ej. NFG_CmpJornada), construye el enlace a la tabla de clasificación oficial actual (NFG_VisClasificacion).
 * Se omite `codjornada` para que el servidor devuelva siempre la clasificación de la última jornada disputada.
 */
export function resolveStandingsUrl(rawUrl: string): string {
  const params = extractFederationUrlParams(rawUrl);
  if (params && params.codCompeticion && params.codGrupo && params.codTemporada) {
    return `${params.origin}/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codcompeticion=${params.codCompeticion}&codgrupo=${params.codGrupo}&codtemporada=${params.codTemporada}`;
  }
  return (rawUrl || '').trim();
}

/**
 * A partir de cualquier enlace de la competición, construye el enlace a la vista de jornada (NFG_CmpJornada).
 */
export function resolveJornadaUrl(rawUrl: string): string {
  const params = extractFederationUrlParams(rawUrl);
  if (params && params.codCompeticion && params.codGrupo && params.codTemporada) {
    return `${params.origin}/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=${params.codCompeticion}&CodGrupo=${params.codGrupo}&CodTemporada=${params.codTemporada}&CodJornada=${params.codJornada || '1'}`;
  }
  return (rawUrl || '').trim();
}

/**
 * Descarga el HTML de una página oficial de competición a través del endpoint propio `/api/fed-proxy`
 * (compatible con Vercel y servidor local Vite) con decodificación automática ISO-8859-15 / UTF-8.
 */
export async function fetchRfafHtmlDirect(targetUrl: string): Promise<string> {
  const cleanUrl = (targetUrl || '').trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Introduce un enlace válido que comience por https://');
  }

  let proxyErrorMsg: string | null = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    const res = await fetch(`/api/fed-proxy?url=${encodeURIComponent(cleanUrl)}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (res.ok) {
      const text = await res.text();
      if (
        text &&
        text.trim().length > 200 &&
        !text.includes('No se ha aceptado el cookie') &&
        !text.includes('export default async function handler')
      ) {
        return text;
      }
    } else {
      const errData = await res.json().catch(() => null);
      if (errData?.error) {
        proxyErrorMsg = errData.error;
        if (res.status === 400) {
          throw new Error(errData.error);
        }
      }
    }
  } catch (err: any) {
    if (proxyErrorMsg && err?.message === proxyErrorMsg) {
      throw err;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    const jinaRes = await fetch(`https://r.jina.ai/${cleanUrl}`, {
      signal: controller.signal,
      headers: {
        'X-Return-Format': 'html',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
    });
    clearTimeout(timeout);
    if (jinaRes.ok) {
      const html = await jinaRes.text();
      if (html && html.trim().length > 500 && !html.includes('No se ha aceptado el cookie')) {
        return html;
      }
    }
  } catch {
    // pasar a los siguientes fallbacks
  }

  const fallbackProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`,
  ];

  for (const proxyUrl of fallbackProxies) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const buffer = await res.arrayBuffer();
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch {
        text = new TextDecoder('iso-8859-15').decode(buffer);
      }
      if (text && text.trim().length > 200 && !text.includes('No se ha aceptado el cookie')) {
        return text;
      }
    } catch {
      // probar siguiente
    }
  }

  throw new Error(
    proxyErrorMsg ||
      'No se pudo conectar directamente con la web de la competición. Revisa el enlace o pega el contenido directamente en el cuadro derecho.'
  );
}
