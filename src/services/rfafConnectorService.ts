import {
  FedCompetitionOption,
  FedGroupOption,
  FedGroupTeamItem,
  FedMatchDayItem,
  FedPlayerCandidate,
  FedStandingRow,
  FedTeamRef,
  Player,
  SancionCompactaUrl,
} from '../types';
import { getGroupForPosition } from '../features/squad/domain/positions';
import { db } from './db';
import { createRivalTeam, loadAndSyncRivals, rivalsDbKey, clearRivalsCache } from '../features/rivals/services/rivalsService';
import { normalizeRfafText } from './quintaAmarillaSync';
import { DEFAULT_TEMPORADA, PRELOADED_COMPETITIONS, PRELOADED_GROUP_TEAMS } from './fedCatalogData';

/**
 * Normaliza el nombre de un club eliminando prefijos/sufijos genéricos (C.D., U.D., C.F., "A", Senior, etc.)
 * para cruzar nombres de equipos de AM Manager ("C.D. Álora Senior") con las tablas oficiales ('C.D. ALORA "A"').
 */
export function normalizeClubIdentity(name?: string): string {
  const cleaned = (name || '')
    .replace(/["'«»“”]/g, ' ')
    .replace(/\([A-Z0-9\s]+\)/gi, ' ');
  const base = normalizeRfafText(cleaned);
  if (!base) return '';
  const stopWords = new Set([
    'CD',
    'UD',
    'CF',
    'AD',
    'SD',
    'CP',
    'AT',
    'ATLETICO',
    'CLUB',
    'DEPORTIVO',
    'FUTBOL',
    'BALOMPIE',
    'SENIOR',
    'JUVENIL',
    'CADETE',
    'INFANTIL',
    'ALEVIN',
    'BENJAMIN',
    'PREBENJAMIN',
    'FEMENINO',
    'A',
  ]);
  const tokens = base.split(' ').filter(t => t && !stopWords.has(t));
  return tokens.length > 0 ? tokens.join(' ') : base;
}

export function clubsMatch(clubA?: string, clubB?: string): boolean {
  const normA = normalizeRfafText((clubA || '').replace(/["'«»“”]/g, ' '));
  const normB = normalizeRfafText((clubB || '').replace(/["'«»“”]/g, ' '));
  if (!normA || !normB) return false;
  if (normA === normB || normA.includes(normB) || normB.includes(normA)) return true;

  const idA = normalizeClubIdentity(clubA);
  const idB = normalizeClubIdentity(clubB);
  if (!idA || !idB) return false;
  return idA === idB || (idA.length >= 4 && idB.length >= 4 && (idA.includes(idB) || idB.includes(idA)));
}

/**
 * Convierte "GARCÍA PÉREZ, JUAN CARLOS" -> "Juan Carlos García" (Nombre + 1er Apellido en Title Case).
 */
export function formatearNombreDeportivoDesdeRfaf(rfafName: string): string {
  const raw = (rfafName || '').trim();
  if (!raw) return '';

  const toTitleCase = (str: string) =>
    str
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  if (!raw.includes(',')) {
    return toTitleCase(raw);
  }

  const [apellidosPart, nombrePart] = raw.split(',').map(s => s.trim());
  const nombreClean = toTitleCase(nombrePart || '');
  const apellidoTokens = (apellidosPart || '').trim().split(/\s+/).filter(Boolean);

  const primerApellidoWords: string[] = [];
  const particles = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'VON', 'VAN']);
  for (let i = 0; i < apellidoTokens.length; i++) {
    const upper = apellidoTokens[i].toUpperCase();
    primerApellidoWords.push(apellidoTokens[i]);
    if (!particles.has(upper)) {
      break;
    }
  }

  const primerApellidoClean = toTitleCase(primerApellidoWords.join(' '));
  return [nombreClean, primerApellidoClean].filter(Boolean).join(' ').trim();
}

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
 * A partir de cualquier enlace de la competición (ej. NFG_CmpJornada), construye el enlace a la tabla de clasificación oficial (NFG_VisClasificacion).
 */
export function resolveStandingsUrl(rawUrl: string): string {
  const params = extractFederationUrlParams(rawUrl);
  if (params && params.codCompeticion && params.codGrupo && params.codTemporada) {
    return `${params.origin}/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codjornada=${params.codJornada || '1'}&codcompeticion=${params.codCompeticion}&codgrupo=${params.codGrupo}&codtemporada=${params.codTemporada}`;
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

  // 1. Intentar primero mediante nuestro propio endpoint serverless `/api/fed-proxy`
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

  // 2. Fallback directo desde el navegador mediante relay con navegador headless (soporta CORS y cookies)
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

  // 3. Fallback secundario
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

/**
 * Extrae la lista de equipos ({ nombre, codigo, fichaUrl }) desde el HTML de NFG_CmpJornada o NFG_VisClasificacion.
 */
export function extractTeamsFromFederationHtml(html: string, origin = 'https://www.rfaf.es'): FedTeamRef[] {
  const teams: FedTeamRef[] = [];
  const seenCodes = new Set<string>();
  if (!html) return teams;

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a[href]'));
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const codeMatch = href.match(/(?:Codigo_Equipo|codequipo)=(\d+)/i);
      if (!codeMatch) continue;
      const codigo = codeMatch[1];
      if (seenCodes.has(codigo)) continue;

      let nombre = (a.textContent || '').replace(/\s+/g, ' ').trim();
      if (!nombre || nombre.length < 2) {
        const td = a.closest('td');
        nombre = (td?.textContent || '').replace(/\s+/g, ' ').trim();
      }
      if (!nombre || nombre.length < 2) continue;

      seenCodes.add(codigo);
      teams.push({
        nombre,
        codigo,
        fichaUrl: `${origin}/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${codigo}`,
      });
    }
  } catch {
    // ignore
  }

  return teams;
}

/**
 * Descarga la plantilla oficial de un equipo a partir de CUALQUIER enlace de la competición
 * (NFG_CmpJornada, NFG_VisCalendario_Vis, NFG_VisClasificacion o NFG_VisEquipos).
 * Si el enlace es de jornada/calendario/clasificación, localiza automáticamente el `Codigo_Equipo` del club indicado.
 */
export async function fetchSquadFromFederationUrl(
  rawUrl: string,
  clubName: string,
  existingPlayers: Player[]
): Promise<{
  candidates: FedPlayerCandidate[];
  detectedTeams: FedTeamRef[];
  matchedTeam?: FedTeamRef;
  resolvedTeamUrl?: string;
}> {
  const params = extractFederationUrlParams(rawUrl);
  const origin = params?.origin || 'https://www.rfaf.es';

  // Caso 1: La URL ya contiene Codigo_Equipo o apunta a NFG_VisEquipos
  if (params?.codigoEquipo) {
    const directTeamUrl = `${origin}/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${params.codigoEquipo}`;
    const html = await fetchRfafHtmlDirect(directTeamUrl);
    return {
      candidates: parseRfafSquadFromHtmlOrText(html, existingPlayers),
      detectedTeams: [],
      resolvedTeamUrl: directTeamUrl,
    };
  }

  // Caso 2: Es una URL de competición (NFG_CmpJornada / NFG_VisCalendario_Vis / NFG_VisClasificacion)
  // Descubrimos los equipos del grupo y buscamos nuestro club
  let html = '';
  let detectedTeams: FedTeamRef[] = [];

  if (params?.codCompeticion && params?.codGrupo && params?.codTemporada) {
    const jornadaUrl = resolveJornadaUrl(rawUrl);
    html = await fetchRfafHtmlDirect(jornadaUrl);
    detectedTeams = extractTeamsFromFederationHtml(html, origin);

    if (detectedTeams.length === 0) {
      const standingsHtml = await fetchRfafHtmlDirect(resolveStandingsUrl(rawUrl));
      detectedTeams = extractTeamsFromFederationHtml(standingsHtml, origin);
    }
  } else {
    html = await fetchRfafHtmlDirect(rawUrl);
    detectedTeams = extractTeamsFromFederationHtml(html, origin);
  }

  if (detectedTeams.length > 0) {
    const matchedTeam =
      detectedTeams.find(t => clubsMatch(t.nombre, clubName)) || detectedTeams[0];
    if (matchedTeam?.fichaUrl) {
      const teamHtml = await fetchRfafHtmlDirect(matchedTeam.fichaUrl);
      return {
        candidates: parseRfafSquadFromHtmlOrText(teamHtml, existingPlayers),
        detectedTeams,
        matchedTeam,
        resolvedTeamUrl: matchedTeam.fichaUrl,
      };
    }
  }

  return {
    candidates: parseRfafSquadFromHtmlOrText(html, existingPlayers),
    detectedTeams,
  };
}

function mapPositionKeyword(rawPos?: string): string {
  const norm = normalizeRfafText(rawPos);
  if (!norm) return 'MC';
  if (norm.includes('PORT') || norm === 'POR' || norm === 'PT') return 'POR';
  if (norm.includes('LAT') && norm.includes('DER')) return 'LD';
  if (norm.includes('LAT') && norm.includes('IZQ')) return 'LI';
  if (norm.includes('DEF') || norm === 'DFC' || norm === 'DF') return 'DFC';
  if (norm.includes('PIVOTE') || norm === 'MCD') return 'MCD';
  if (norm.includes('MEDIAPUNTA') || norm === 'MCO' || norm === 'MP') return 'MCO';
  if (norm.includes('EXT') && norm.includes('DER')) return 'ED';
  if (norm.includes('EXT') && norm.includes('IZQ')) return 'EI';
  if (norm.includes('DEL') || norm.includes('ATAC') || norm === 'DC' || norm === 'DL') return 'DC';
  return 'MC';
}

function findExistingPlayerForRfafName(
  rfafName: string,
  existingPlayers: Player[],
  usedIds: Set<string>
): Player | undefined {
  const normTarget = normalizeRfafText(rfafName);
  if (!normTarget) return undefined;

  for (const p of existingPlayers) {
    if (!p || p.isActive === false || usedIds.has(p.id)) continue;
    if (p.rfafName && normalizeRfafText(p.rfafName) === normTarget) {
      return p;
    }
  }

  const suggestedNorm = normalizeRfafText(formatearNombreDeportivoDesdeRfaf(rfafName));
  const allTokens = normTarget.split(' ').filter(t => t.length >= 2);

  for (const p of existingPlayers) {
    if (!p || p.isActive === false || usedIds.has(p.id)) continue;
    const pNorm = normalizeRfafText(p.name);
    if (!pNorm) continue;
    if (pNorm === suggestedNorm || pNorm === normTarget) {
      return p;
    }
    const pTokens = pNorm.split(' ').filter(t => t.length >= 2);
    if (pTokens.length >= 2 && pTokens.every(t => allTokens.includes(t))) {
      return p;
    }
  }

  return undefined;
}

/**
 * Extrae candidatos de plantilla desde HTML (NFG_VisEquipos) o texto pegado (listado de actas / plantilla),
 * cruzándolos con los jugadores actuales del equipo.
 */
export function parseRfafSquadFromHtmlOrText(
  rawInput: string,
  existingPlayers: Player[]
): FedPlayerCandidate[] {
  const extracted: { rfafName: string; number?: number; position?: string }[] = [];
  const seenNames = new Set<string>();

  const pushCandidate = (rawName: string, number?: number, pos?: string) => {
    const cleaned = rawName
      .replace(/^\d+[\s.\-|)]+/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    const norm = normalizeRfafText(cleaned);
    if (!norm || norm.length < 4 || seenNames.has(norm)) return;
    const badHeaders = [
      'NOMBRE',
      'JUGADOR',
      'JUGADORES',
      'APELLIDOS',
      'POSICION',
      'DORSAL',
      'LICENCIA',
      'EDAD',
      'TARJETAS',
      'PARTIDOS',
      'ENTRENADOR',
      'DELEGADO',
      'TECNICOS',
      'DELEGADOS',
      'AUXILIARES',
    ];
    if (badHeaders.includes(norm)) return;
    seenNames.add(norm);
    extracted.push({ rfafName: cleaned, number, position: pos });
  };

  const trimmed = (rawInput || '').trim();
  if (trimmed.includes('<table') || trimmed.includes('<tr') || trimmed.includes('<a')) {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      const tables = Array.from(doc.querySelectorAll('table'));

      // En NFG_VisEquipos hay una tabla específica con cabecera "Jugadores (N)" y otras para "Técnicos", "Delegados", "Auxiliares"
      const jugadoresTables = tables.filter(tbl => {
        const thText = Array.from(tbl.querySelectorAll('th'))
          .map(th => normalizeRfafText(th.textContent || ''))
          .join(' ');
        return thText.includes('JUGADOR');
      });

      const targetTables = jugadoresTables.length > 0 ? jugadoresTables : tables;

      for (const tbl of targetTables) {
        const thText = Array.from(tbl.querySelectorAll('th'))
          .map(th => normalizeRfafText(th.textContent || ''))
          .join(' ');
        if (
          jugadoresTables.length === 0 &&
          (thText.includes('TECNICO') || thText.includes('DELEGADO') || thText.includes('AUXILIAR'))
        ) {
          continue;
        }

        const rows = Array.from(tbl.querySelectorAll('tr'));
        for (const tr of rows) {
          const cells = Array.from(tr.querySelectorAll('td')).map(c =>
            (c.textContent || '').replace(/\s+/g, ' ').trim()
          );
          const nameCell = cells.find(c =>
            /^[A-ZÁÉÍÓÚÑÜa-záéíóúñü\s\-'.]{2,},\s*[A-ZÁÉÍÓÚÑÜa-záéíóúñü\s\-'.]{2,}$/i.test(c)
          );
          if (nameCell) {
            const numCell = cells.find(c => /^\d{1,2}$/.test(c));
            const posCell = cells.find(c => /(portero|defensa|medio|centrocampista|delantero)/i.test(c));
            pushCandidate(nameCell, numCell ? Number(numCell) : undefined, posCell);
          }
        }
      }
    } catch {
      // fallback a texto plano
    }
  }

  if (extracted.length === 0 && trimmed) {
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      const cleanLine = line.replace(/\t+/g, ' | ').trim();
      if (!cleanLine) continue;

      const rfafRegex = /([A-ZÁÉÍÓÚÑÜa-záéíóúñü][A-ZÁÉÍÓÚÑÜa-záéíóúñü\s\-'.]{1,},\s*[A-ZÁÉÍÓÚÑÜa-záéíóúñü][A-ZÁÉÍÓÚÑÜa-záéíóúñü\s\-'.]{1,})/;
      const match = cleanLine.match(rfafRegex);
      if (match) {
        const numMatch = cleanLine.match(/(?:^|\|\s*)(\d{1,2})(?:\s*\||\s+|-)/);
        const posMatch = cleanLine.match(
          /\b(POR|DFC|LD|LI|MCD|MC|MCO|ED|EI|DC|Portero|Defensa|Medio|Centrocampista|Delantero)\b/i
        );
        pushCandidate(
          match[1],
          numMatch ? Number(numMatch[1]) : undefined,
          posMatch ? posMatch[1] : undefined
        );
      } else if (/^(?:\d{1,2}[\s.\-|)]+)?[A-ZÁÉÍÓÚÑÜa-záéíóúñü\s]{4,}$/.test(cleanLine)) {
        const numPrefix = cleanLine.match(/^(\d{1,2})[\s.\-|)]+(.*)$/);
        if (numPrefix) {
          pushCandidate(numPrefix[2], Number(numPrefix[1]));
        } else {
          pushCandidate(cleanLine);
        }
      }
    }
  }

  return buildCandidateList(extracted, existingPlayers);
}

/**
 * Construye candidatos iniciales a partir de los jugadores que ya tienen nombre de acta vinculado o sanciones pendientes de QuintaAmarilla.
 */
export function buildCandidatesFromCurrentTeam(
  existingPlayers: Player[],
  unmatchedSanciones: SancionCompactaUrl[] = []
): FedPlayerCandidate[] {
  const seed: { rfafName: string; number?: number; position?: string }[] = [];
  const seen = new Set<string>();

  for (const p of existingPlayers || []) {
    if (!p || p.isActive === false) continue;
    if (p.rfafName) {
      const norm = normalizeRfafText(p.rfafName);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        seed.push({ rfafName: p.rfafName, number: p.number, position: p.position });
      }
    }
  }

  for (const s of unmatchedSanciones || []) {
    if (!s?.j) continue;
    const norm = normalizeRfafText(s.j);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      seed.push({ rfafName: s.j });
    }
  }

  return buildCandidateList(seed, existingPlayers);
}

function buildCandidateList(
  items: { rfafName: string; number?: number; position?: string }[],
  existingPlayers: Player[]
): FedPlayerCandidate[] {
  const usedPlayerIds = new Set<string>();
  const usedNumbers = new Set<number>(
    (existingPlayers || []).filter(p => p && p.isActive !== false).map(p => p.number)
  );

  const nextFreeNumber = (): number => {
    for (let n = 1; n <= 99; n++) {
      if (!usedNumbers.has(n)) {
        usedNumbers.add(n);
        return n;
      }
    }
    return 0;
  };

  return items.map((item, idx) => {
    const matched = findExistingPlayerForRfafName(item.rfafName, existingPlayers, usedPlayerIds);
    if (matched) {
      usedPlayerIds.add(matched.id);
    }

    const suggestedName = matched?.name || formatearNombreDeportivoDesdeRfaf(item.rfafName);
    const number =
      typeof item.number === 'number' && item.number >= 0 && item.number <= 99
        ? item.number
        : matched
        ? matched.number
        : nextFreeNumber();
    const position = matched?.position || mapPositionKeyword(item.position);

    return {
      id: `fed_cand_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      rfafName: item.rfafName,
      suggestedName,
      number,
      position,
      matchedPlayerId: matched?.id,
      matchedPlayerName: matched?.name,
      selected: true,
    };
  });
}

/**
 * Aplica los candidatos validados por el entrenador sobre la plantilla activa del equipo.
 */
export function aplicarCandidatosValidadosAPlantilla(
  existingPlayers: Player[],
  candidates: FedPlayerCandidate[],
  unmatchedSanciones: SancionCompactaUrl[] = []
): {
  updatedPlayers: Player[];
  remainingUnmatched: SancionCompactaUrl[];
  addedCount: number;
  linkedCount: number;
} {
  const selected = (candidates || []).filter(c => c.selected && c.rfafName.trim() && c.suggestedName.trim());
  const nextPlayers: Player[] = [...(existingPlayers || [])];
  let addedCount = 0;
  let linkedCount = 0;

  const sancionesByNorm = new Map<string, SancionCompactaUrl>();
  for (const s of unmatchedSanciones || []) {
    const k = normalizeRfafText(s.j);
    if (k) sancionesByNorm.set(k, s);
  }

  const resolvedNorms = new Set<string>();

  for (const cand of selected) {
    const pos = cand.position || 'MC';
    const posGroup = getGroupForPosition(pos) || 'Medios';
    const normRfaf = normalizeRfafText(cand.rfafName);
    const pendingSancion = sancionesByNorm.get(normRfaf);

    if (cand.matchedPlayerId) {
      const idx = nextPlayers.findIndex(p => p && p.id === cand.matchedPlayerId);
      if (idx !== -1) {
        const prev = nextPlayers[idx];
        nextPlayers[idx] = {
          ...prev,
          name: cand.suggestedName.trim(),
          number: Number.isInteger(cand.number) ? cand.number : prev.number,
          position: pos,
          positionGroup: posGroup,
          rfafName: cand.rfafName.trim(),
          ...(pendingSancion
            ? {
                rfafCycleCards: pendingSancion.ciclo,
                isSuspended: pendingSancion.sanc === 1,
                suspensionReason:
                  pendingSancion.sanc === 1
                    ? pendingSancion.det || `${pendingSancion.mot} (Art. ${pendingSancion.art})`
                    : undefined,
                isCarriedOverSuspension: pendingSancion.arr === 1,
              }
            : {}),
        };
        linkedCount++;
        if (normRfaf) resolvedNorms.add(normRfaf);
        continue;
      }
    }

    const newPlayer: Player = {
      id: Math.random().toString(36).slice(2, 11),
      number: Number.isInteger(cand.number) && cand.number >= 0 && cand.number <= 99 ? cand.number : 0,
      name: cand.suggestedName.trim(),
      position: pos,
      positionGroup: posGroup,
      status: 'available',
      isActive: true,
      rfafName: cand.rfafName.trim(),
      rfafCycleCards: pendingSancion?.ciclo ?? 0,
      isSuspended: pendingSancion?.sanc === 1,
      suspensionReason:
        pendingSancion?.sanc === 1
          ? pendingSancion.det || `${pendingSancion.mot} (Art. ${pendingSancion.art})`
          : undefined,
      isCarriedOverSuspension: pendingSancion?.arr === 1,
      height: '178 cm',
      foot: 'Derecho',
      stats: {
        matchesPlayed: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
      },
      attendance: { trainingPercentage: 100, matchPercentage: 100 },
      evaluations: [],
      notes: '',
    };
    nextPlayers.push(newPlayer);
    addedCount++;
    if (normRfaf) resolvedNorms.add(normRfaf);
  }

  const remainingUnmatched = (unmatchedSanciones || []).filter(
    s => !resolvedNorms.has(normalizeRfafText(s.j))
  );

  return {
    updatedPlayers: nextPlayers,
    remainingUnmatched,
    addedCount,
    linkedCount,
  };
}

/**
 * Convierte fechas en formato DD/MM/YYYY, DD-MM-YYYY o YYYY-MM-DD a YYYY-MM-DD.
 */
export function normalizeRfafDate(rawDate: string): string | null {
  const clean = (rawDate || '').trim();
  const isoMatch = clean.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const esMatch = clean.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2}|\d{2})\b/);
  if (esMatch) {
    let [, d, m, y] = esMatch;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

/**
 * Decodifica el dígito de un bloque `<strong>` de goles en `NFG_VisCalendario_Vis`,
 * resolviendo tanto la ofuscación `ntype("id", n, i, "fa-...")` como los `<span>` señuelo ocultos.
 */
function decodeNovanetGoalStrong(strongEl: Element): number | undefined {
  const html = strongEl.innerHTML || '';
  const ntypeMatch = html.match(/ntype\s*\(\s*["'][^"']*["']\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (ntypeMatch) {
    const n = Number(ntypeMatch[1]);
    const i = Number(ntypeMatch[2]);
    const d = [
      2, 5, 9, 4, 1, 0, 8, 6, 3, 7,
      1, 3, 5, 7, 9, 0, 2, 4, 6, 8,
      0, 2, 4, 6, 8, 1, 3, 5, 7, 9,
      7, 5, 2, 0, 9, 6, 3, 8, 4, 1,
    ];
    const idx = i * 10 + n;
    if (idx >= 0 && idx < d.length) {
      return d[idx];
    }
  }

  const clone = strongEl.cloneNode(true) as Element;
  clone.querySelectorAll('script, style, [style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
  const visibleDigits = (clone.textContent || '').replace(/\D+/g, '').trim();
  if (visibleDigits.length > 0) {
    return Number(visibleDigits);
  }
  return undefined;
}

/**
 * Extrae jornadas del calendario y clubes rivales desde HTML (NFG_VisCalendario_Vis / NFG_CmpJornada)
 * o desde texto/tablas pegadas por el entrenador (incluyendo filas separadas por tabuladores o espacios sin guion).
 */
export function parseRfafCalendarFromHtmlOrText(
  rawInput: string,
  clubRfaf?: string
): {
  matches: FedMatchDayItem[];
  detectedClubs: string[];
} {
  const allMatches: FedMatchDayItem[] = [];
  const clubsSet = new Set<string>();
  const todayIso = new Date().toISOString().split('T')[0];

  const registerClub = (name: string) => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (
      clean.length >= 3 &&
      !/^\d+$/.test(clean) &&
      !/^(jornada|fecha|hora|campo|grupo|temporada)\b/i.test(clean)
    ) {
      clubsSet.add(clean);
    }
  };

  const trimmed = (rawInput || '').trim();

  // 1. Parseo directo de HTML estructurado (NFG_VisCalendario_Vis y NFG_CmpJornada)
  if (trimmed.includes('<table') || trimmed.includes('<tr') || trimmed.includes('font_widgetL')) {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');

      // 1A. Estructura de Calendario Completo (`NFG_VisCalendario_Vis`): tablas con `th` "Jornada X (DD-MM-YYYY)" y celdas `td.anchogoles`
      const tables = Array.from(doc.querySelectorAll('table'));
      for (const tbl of tables) {
        const headerTh = tbl.querySelector('th');
        const headerText = (headerTh?.textContent || '').replace(/\s+/g, ' ').trim();
        const jorMatch = headerText.match(/Jornada\s+(\d{1,2})/i);
        if (!jorMatch) continue;

        const jornadaNum = Number(jorMatch[1]);
        const fechaJornada = normalizeRfafDate(headerText) || todayIso;

        const rows = Array.from(tbl.querySelectorAll('tr'));
        for (const tr of rows) {
          const tds = Array.from(tr.querySelectorAll('td'));
          if (tds.length < 3) continue;

          const local = (tds[0].textContent || '').replace(/\s+/g, ' ').trim();
          const scoreTd = tds[1];
          const visitante = (tds[2].textContent || '').replace(/\s+/g, ' ').trim();

          if (!local || !visitante || local.length < 2 || visitante.length < 2) continue;

          let golesLocal: number | undefined;
          let golesVisitante: number | undefined;
          const strongs = Array.from(scoreTd.querySelectorAll('strong'));
          if (strongs.length >= 2) {
            const gl = decodeNovanetGoalStrong(strongs[0]);
            const gv = decodeNovanetGoalStrong(strongs[1]);
            if (typeof gl === 'number' && typeof gv === 'number') {
              golesLocal = gl;
              golesVisitante = gv;
            }
          }

          registerClub(local);
          registerClub(visitante);
          allMatches.push({
            jornada: jornadaNum,
            fecha: fechaJornada,
            local,
            visitante,
            golesLocal,
            golesVisitante,
            jugado: typeof golesLocal === 'number' && typeof golesVisitante === 'number',
          });
        }
      }

      // 1B. Estructura de Vista de Jornada (`NFG_CmpJornada`): `.font_widgetL` y `.font_widgetV`
      if (allMatches.length === 0) {
        let pageJornada = 1;
        const bodyText = (doc.body?.textContent || '').replace(/\s+/g, ' ');
        const jorMatch = bodyText.match(/Jornada\s+(\d{1,2})/i);
        if (jorMatch) pageJornada = Number(jorMatch[1]);
        const pageDate = normalizeRfafDate(bodyText) || todayIso;

        const localSpans = Array.from(doc.querySelectorAll('.font_widgetL'));
        for (const lSpan of localSpans) {
          const containerRow = lSpan.closest('tr');
          const vSpan = containerRow?.querySelector('.font_widgetV');
          if (!containerRow || !vSpan) continue;

          const local = (lSpan.textContent || '').replace(/\s+/g, ' ').trim();
          const visitante = (vSpan.textContent || '').replace(/\s+/g, ' ').trim();
          if (!local || !visitante) continue;

          const horarios = Array.from(containerRow.querySelectorAll('.horario')).map(h =>
            (h.textContent || '').replace(/\s+/g, ' ').trim()
          );
          const dateFound = horarios.map(h => normalizeRfafDate(h)).find(Boolean) || pageDate;
          const timeFound = horarios
            .map(h => h.match(/\b(\d{1,2}:\d{2})\b/)?.[1])
            .find(Boolean);

          // Comprobar si hay marcador numérico en el bloque central
          let golesLocal: number | undefined;
          let golesVisitante: number | undefined;
          const centerTds = Array.from(containerRow.querySelectorAll('td'));
          if (centerTds.length >= 2) {
            const centerText = (centerTds[1].textContent || '').replace(/\s+/g, ' ').trim();
            const scoreMatch = centerText.match(/^(\d{1,2})\s*[-–:]?\s*(\d{1,2})$/);
            if (scoreMatch) {
              golesLocal = Number(scoreMatch[1]);
              golesVisitante = Number(scoreMatch[2]);
            }
          }

          registerClub(local);
          registerClub(visitante);
          allMatches.push({
            jornada: pageJornada,
            fecha: dateFound,
            hora: timeFound,
            local,
            visitante,
            golesLocal,
            golesVisitante,
            jugado: typeof golesLocal === 'number' && typeof golesVisitante === 'number',
          });
        }
      }
    } catch {
      // continuar con el parser de texto
    }
  }

  // 2. Parseo de texto pegado por el usuario (incluyendo filas copiadas con tabuladores o 2+ espacios sin guion)
  if (allMatches.length === 0 && trimmed) {
    let rawLines = trimmed.split(/\r?\n/);
    if (trimmed.includes('<tr')) {
      try {
        const doc = new DOMParser().parseFromString(trimmed, 'text/html');
        const extracted: string[] = [];
        doc.querySelectorAll('tr, h3, h4, h5, caption, th').forEach(el => {
          const cells = Array.from(el.querySelectorAll('td, th')).map(c =>
            (c.textContent || '').replace(/\s+/g, ' ').trim()
          );
          if (cells.length >= 2) {
            extracted.push(cells.join('\t'));
          } else {
            const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (txt) extracted.push(txt);
          }
        });
        if (extracted.length > 0) rawLines = extracted;
      } catch {
        // ignore
      }
    }

    let currentJornada = 1;
    let currentDate = '';

    for (const rawLine of rawLines) {
      const trimmedLine = rawLine.trim();
      if (!trimmedLine) continue;

      const singleSpaced = trimmedLine.replace(/\s+/g, ' ');
      const jorHeader = singleSpaced.match(/\b(?:jornada|jor\.?|j)\s*(\d{1,2})\b/i);
      const dateInLine = normalizeRfafDate(singleSpaced);

      // Si la línea es únicamente una cabecera de jornada ("Jornada 2 (20-09-2026)")
      const withoutJorAndDate = singleSpaced
        .replace(/\b(?:jornada|jor\.?|j)\s*\d{1,2}\b/gi, '')
        .replace(/\(\s*\d{1,2}[-/]\d{1,2}[-/](?:20\d{2}|\d{2})\s*\)/g, '')
        .replace(/\b\d{1,2}[-/]\d{1,2}[-/](?:20\d{2}|\d{2})\b/g, '')
        .replace(/[():\-|]/g, '')
        .trim();

      if (jorHeader && withoutJorAndDate.length < 3) {
        currentJornada = Number(jorHeader[1]);
        if (dateInLine) currentDate = dateInLine;
        continue;
      }

      if (jorHeader) currentJornada = Number(jorHeader[1]);
      if (dateInLine) currentDate = dateInLine;

      // Limpiar jornada, fecha y hora conservando los tabuladores o dobles espacios entre equipos
      let matchSegment = trimmedLine
        .replace(/\b(?:jornada|jor\.?|j)\s*\d{1,2}\b[:\-|]?/gi, '')
        .replace(/\(\s*\d{1,2}[-/]\d{1,2}[-/](?:20\d{2}|\d{2})\s*\)/g, '')
        .replace(/\b\d{1,2}[-/]\d{1,2}[-/](?:20\d{2}|\d{2})\b/g, '')
        .replace(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g, '')
        .trim();

      const timeMatch = matchSegment.match(/\b(\d{1,2}:\d{2})\b/);
      const hora = timeMatch ? timeMatch[1] : undefined;
      if (hora) {
        matchSegment = matchSegment.replace(hora, '').trim();
      }

      const normSegment = matchSegment.replace(/\s+/g, ' ').trim();

      // Patrón 1: Con marcador numérico "EQUIPO LOCAL 2 - 1 EQUIPO VISITANTE" o "EQUIPO LOCAL 2 1 EQUIPO VISITANTE"
      const scoredMatch = normSegment.match(
        /^([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"«»“”\-()]{3,}?)\s+(\d{1,2})\s*(?:[-–:]|\s)\s*(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"«»“”\-()]{3,})$/
      );
      if (scoredMatch) {
        const local = scoredMatch[1].replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();
        const golesLocal = Number(scoredMatch[2]);
        const golesVisitante = Number(scoredMatch[3]);
        const visitante = scoredMatch[4].replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();

        if (local && visitante && !clubsMatch(local, visitante)) {
          registerClub(local);
          registerClub(visitante);
          allMatches.push({
            jornada: currentJornada,
            fecha: dateInLine || currentDate || todayIso,
            hora,
            local,
            visitante,
            golesLocal,
            golesVisitante,
            jugado: true,
          });
          if (!jorHeader) currentJornada++;
          continue;
        }
      }

      // Patrón 2: Partido sin disputar con separador explícito ("-", "–", "vs", "|")
      const pendingMatch = normSegment.match(
        /^([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"«»“”()]{3,}?)\s+(?:[-–|]|vs\.?|VS)\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"«»“”()]{3,})$/
      );
      if (pendingMatch) {
        const local = pendingMatch[1].replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();
        const visitante = pendingMatch[2].replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();

        if (local && visitante && !clubsMatch(local, visitante)) {
          registerClub(local);
          registerClub(visitante);
          allMatches.push({
            jornada: currentJornada,
            fecha: dateInLine || currentDate || todayIso,
            hora,
            local,
            visitante,
            jugado: false,
          });
          if (!jorHeader) currentJornada++;
          continue;
        }
      }

      // Patrón 3: Filas copiadas de la tabla web donde el icono `<i class="fa fa-minus">` desaparece al copiar,
      // dejando `EQUIPO LOCAL \t EQUIPO VISITANTE` o `EQUIPO LOCAL      EQUIPO VISITANTE` (2 o más espacios)
      const tabOrMultiSpaceParts = matchSegment
        .split(/\t+|\s{2,}/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      if (tabOrMultiSpaceParts.length >= 2) {
        const first = tabOrMultiSpaceParts[0];
        const last = tabOrMultiSpaceParts[tabOrMultiSpaceParts.length - 1];
        const middle = tabOrMultiSpaceParts.slice(1, -1).join(' ');
        const midScores = middle.match(/^(\d{1,2})\s*[-–:]?\s*(\d{1,2})$/);

        if (
          first.length >= 3 &&
          last.length >= 3 &&
          !/^\d+$/.test(first) &&
          !/^\d+$/.test(last) &&
          !clubsMatch(first, last)
        ) {
          registerClub(first);
          registerClub(last);
          allMatches.push({
            jornada: currentJornada,
            fecha: dateInLine || currentDate || todayIso,
            hora,
            local: first,
            visitante: last,
            ...(midScores
              ? {
                  golesLocal: Number(midScores[1]),
                  golesVisitante: Number(midScores[2]),
                  jugado: true,
                }
              : { jugado: false }),
          });
          if (!jorHeader) currentJornada++;
        }
      }
    }
  }

  const targetClub = (clubRfaf || '').trim();
  const hasMyClubMatches =
    Boolean(targetClub) &&
    allMatches.some(m => clubsMatch(m.local, targetClub) || clubsMatch(m.visitante, targetClub));

  const filteredMatches = hasMyClubMatches
    ? allMatches.filter(m => clubsMatch(m.local, targetClub) || clubsMatch(m.visitante, targetClub))
    : allMatches;

  const detectedClubs = Array.from(clubsSet).filter(c => !targetClub || !clubsMatch(c, targetClub));

  return {
    matches: filteredMatches.map((m, idx) => ({
      ...m,
      jornada: m.jornada || idx + 1,
    })),
    detectedClubs,
  };
}

/**
 * Importa los partidos del calendario oficial en `season_plan` y registra automáticamente todos los rivales
 * del grupo en el directorio de `Rivales & Scouting`.
 */
export async function importarCalendarioRfafEnPlan(params: {
  teamId: string;
  clubRfaf: string;
  competicion: string;
  matches: FedMatchDayItem[];
  detectedClubs?: string[];
  homeStadium?: string;
}): Promise<{
  importedMatchesCount: number;
  createdRivalsCount: number;
}> {
  const { teamId, clubRfaf, competicion, matches, detectedClubs = [], homeStadium = '' } = params;
  const currentPlan = (await db.getSeasonPlan(teamId).catch(() => ({}))) || {};
  const nextPlan: Record<string, any> = { ...currentPlan };

  const rivalNamesSet = new Set<string>(detectedClubs.filter(Boolean));
  let importedMatchesCount = 0;

  for (const m of matches) {
    if (!m.fecha || (!m.local && !m.visitante)) continue;
    const isHome = clubsMatch(m.local, clubRfaf) || !clubsMatch(m.visitante, clubRfaf);
    const opponent = (isHome ? m.visitante : m.local).trim();
    if (!opponent) continue;

    rivalNamesSet.add(opponent);

    const hasScore = typeof m.golesLocal === 'number' && typeof m.golesVisitante === 'number';
    const isPlayed = Boolean(m.jugado || hasScore);
    const scoreStr = hasScore ? `${m.golesLocal} - ${m.golesVisitante}` : undefined;
    const compLabel = m.jornada
      ? `${competicion || 'Liga Oficial'} · J${m.jornada}`
      : competicion || 'Liga Oficial';

    const dateKey = m.fecha;
    const existingDay = nextPlan[dateKey] || {};

    nextPlan[dateKey] = {
      ...existingDay,
      dateString: dateKey,
      teamId,
      type: 'match',
      isMatchDay: true,
      isRestDay: false,
      playersNeeded: existingDay.playersNeeded || 18,
      plannedExercises: existingDay.plannedExercises || [],
      opponent,
      location: isHome ? 'home' : 'away',
      isPlayed,
      played: isPlayed,
      completed: isPlayed,
      externalPlayed: isPlayed,
      rfafPlayed: isPlayed,
      rfafJornada: m.jornada,
      ...(scoreStr ? { score: scoreStr } : {}),
      matchDetails: {
        ...(existingDay.matchDetails || {}),
        opponent,
        isHome,
        competition: compLabel,
        time: m.hora || existingDay.matchDetails?.time || '',
        location: isHome ? homeStadium : m.campo || existingDay.matchDetails?.location || '',
        played: isPlayed,
        ...(scoreStr ? { score: scoreStr } : {}),
      },
    };
    importedMatchesCount++;
  }

  await db.saveSeasonPlan(nextPlan, teamId);

  const existingRivals = await loadAndSyncRivals(teamId, true);
  const byNorm = new Map(existingRivals.map(r => [normalizeClubIdentity(r.name), r]));
  let createdRivalsCount = 0;

  for (const rivalName of rivalNamesSet) {
    if (clubsMatch(rivalName, clubRfaf)) continue;
    const norm = normalizeClubIdentity(rivalName);
    if (!norm || byNorm.has(norm)) continue;
    const created = createRivalTeam(rivalName.trim());
    existingRivals.push(created);
    byNorm.set(norm, created);
    createdRivalsCount++;
  }

  if (createdRivalsCount > 0) {
    const sorted = existingRivals.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    await db.saveAppState(rivalsDbKey(teamId), sorted);
    clearRivalsCache(teamId);
  }

  return {
    importedMatchesCount,
    createdRivalsCount,
  };
}

/**
 * Parsea la tabla de Clasificación Oficial desde HTML (`NFG_VisClasificacion`) o texto pegado.
 */
export function parseRfafStandingsFromHtmlOrText(rawInput: string): FedStandingRow[] {
  const rows: FedStandingRow[] = [];
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return [];

  // 1. Parseo directo de tabla HTML (`NFG_VisClasificacion` con desglose Casa + Fuera o tabla estándar)
  if (trimmed.includes('<table') || trimmed.includes('<tr')) {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      for (const tr of trs) {
        const tds = Array.from(tr.querySelectorAll('td'));
        if (tds.length < 8) continue;

        const texts = tds.map(td => (td.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim());
        // Detectar si td[0] está vacío (barra de color en NFG_VisClasificacion) y td[1] es la posición
        const offset = !texts[0] && /^\d{1,2}$/.test(texts[1] || '') ? 1 : 0;
        const posStr = (texts[offset] || '').replace(/[ºª.\-)]/g, '');
        const eqName = texts[offset + 1] || '';

        if (!/^\d{1,2}$/.test(posStr) || !eqName || /^\d+$/.test(eqName)) continue;

        const posicion = Number(posStr);
        const codeLink = tds[offset + 1]?.querySelector('a[href*="codequipo="], a[href*="Codigo_Equipo="]');
        const codeMatch = codeLink?.getAttribute('href')?.match(/(?:codequipo|Codigo_Equipo)=(\d+)/i);
        const codigoEquipo = codeMatch ? codeMatch[1] : undefined;

        // Formato NFG_VisClasificacion (Casa J,G,E,P + Fuera J,G,E,P + GF + GC):
        // offset+2 = Puntos, offset+3..6 = Casa(J,G,E,P), offset+7..10 = Fuera(J,G,E,P), offset+11 = GF, offset+12 = GC
        if (texts.length >= offset + 13 && /^\d+$/.test(texts[offset + 2]) && /^\d+$/.test(texts[offset + 7])) {
          const puntos = Number(texts[offset + 2]) || 0;
          const cJ = Number(texts[offset + 3]) || 0;
          const cG = Number(texts[offset + 4]) || 0;
          const cE = Number(texts[offset + 5]) || 0;
          const cP = Number(texts[offset + 6]) || 0;
          const fJ = Number(texts[offset + 7]) || 0;
          const fG = Number(texts[offset + 8]) || 0;
          const fE = Number(texts[offset + 9]) || 0;
          const fP = Number(texts[offset + 10]) || 0;
          const gf = Number(texts[offset + 11]) || 0;
          const gc = Number(texts[offset + 12]) || 0;

          if (cJ === cG + cE + cP && fJ === fG + fE + fP) {
            rows.push({
              posicion,
              equipo: eqName,
              puntos,
              pj: cJ + fJ,
              pg: cG + fG,
              pe: cE + fE,
              pp: cP + fP,
              gf,
              gc,
              codigoEquipo,
            });
            continue;
          }
        }

        // Formato estándar de 8/9 columnas (Pos, Equipo, PTS, PJ, PG, PE, PP, GF, GC)
        const nums = texts
          .slice(offset + 2)
          .filter(t => /^\d{1,3}$/.test(t))
          .map(Number);

        if (nums.length >= 5) {
          let [puntos, pj, pg, pe, pp, gf = 0, gc = 0] = nums;
          if (puntos === pj + pg + pe && pj * 3 + pg !== puntos) {
            pj = nums[0];
            pg = nums[1];
            pe = nums[2];
            pp = nums[3];
            gf = nums[4] || 0;
            gc = nums[5] || 0;
            puntos = nums[6] ?? pg * 3 + pe;
          }
          rows.push({
            posicion,
            equipo: eqName,
            puntos,
            pj,
            pg,
            pe,
            pp,
            gf,
            gc,
            codigoEquipo,
          });
        }
      }
    } catch {
      // fallback a texto plano
    }
  }

  if (rows.length > 0) {
    return rows.sort((a, b) => a.posicion - b.posicion);
  }

  // 2. Parseo de texto plano pegado por el entrenador (tanto tabla estándar como tabla Casa+Fuera copiada del navegador)
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const clean = line.replace(/\t+/g, ' ').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    const match = clean.match(
      /^(\d{1,2})[ºª.\-)]?\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"«»“”\-()]{3,}?)\s+((?:\d{1,3}\s*){5,13})/
    );
    if (!match) continue;

    const posicion = Number(match[1]);
    const equipo = match[2].trim();
    const nums = match[3].trim().split(/\s+/).map(Number);

    if (nums.length >= 11) {
      const [puntos, cJ, cG, cE, cP, fJ, fG, fE, fP, gf = 0, gc = 0] = nums;
      if (cJ === cG + cE + cP && fJ === fG + fE + fP) {
        rows.push({
          posicion: posicion || rows.length + 1,
          equipo,
          puntos,
          pj: cJ + fJ,
          pg: cG + fG,
          pe: cE + fE,
          pp: cP + fP,
          gf,
          gc,
        });
        continue;
      }
    }

    if (nums.length >= 5) {
      let [puntos, pj, pg, pe, pp, gf = 0, gc = 0] = nums;
      if (puntos === pj + pg + pe && pj * 3 + pg !== puntos) {
        pj = nums[0];
        pg = nums[1];
        pe = nums[2];
        pp = nums[3];
        gf = nums[4] || 0;
        gc = nums[5] || 0;
        puntos = nums[6] ?? pg * 3 + pe;
      }
      rows.push({
        posicion: posicion || rows.length + 1,
        equipo,
        puntos,
        pj,
        pg,
        pe,
        pp,
        gf,
        gc,
      });
    }
  }

  return rows.sort((a, b) => a.posicion - b.posicion);
}

/**
 * Busca la fila de clasificación correspondiente a un equipo o rival.
 */
export function findStandingForClub(
  standings: FedStandingRow[] | undefined,
  clubName?: string
): FedStandingRow | undefined {
  if (!standings || standings.length === 0 || !clubName) return undefined;
  return standings.find(row => clubsMatch(row.equipo, clubName));
}

/**
 * Da de alta en Rivales & Scouting todos los clubes presentes en la tabla de clasificación oficial.
 */
export async function syncRivalsFromStandings(
  teamId: string | undefined,
  clubRfaf: string,
  rows: FedStandingRow[]
): Promise<void> {
  if (!teamId || !rows || rows.length === 0) return;
  const existingRivals = await loadAndSyncRivals(teamId, true);
  const byNorm = new Map(existingRivals.map(r => [normalizeClubIdentity(r.name), r]));
  let added = 0;

  for (const row of rows) {
    if (clubsMatch(row.equipo, clubRfaf)) continue;
    const norm = normalizeClubIdentity(row.equipo);
    if (!norm || byNorm.has(norm)) continue;
    const created = createRivalTeam(row.equipo.trim());
    existingRivals.push(created);
    byNorm.set(norm, created);
    added++;
  }

  if (added > 0) {
    const sorted = existingRivals.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    await db.saveAppState(rivalsDbKey(teamId), sorted);
    clearRivalsCache(teamId);
  }
}

// ===================================================================
// DESCUBRIMIENTO DINÁMICO DE COMPETICIONES, GRUPOS Y EQUIPOS (SIN URLS)
// ===================================================================

const cachedCompetitionsBySeason = new Map<string, FedCompetitionOption[]>();
const cachedGroupsByComp = new Map<string, FedGroupOption[]>();
const cachedTeamsByGroup = new Map<string, FedGroupTeamItem[]>();

export function getPreloadedCompetitions(): FedCompetitionOption[] {
  return PRELOADED_COMPETITIONS;
}

export function getPreloadedGroups(codCompeticion: string): FedGroupOption[] {
  const cached = cachedGroupsByComp.get(`${DEFAULT_TEMPORADA}:${codCompeticion}`);
  if (cached && cached.length > 0) return cached;
  const found = PRELOADED_COMPETITIONS.find(c => c.codCompeticion === codCompeticion);
  return found?.grupos || [];
}

export function getPreloadedTeamsInGroup(codGrupo: string): FedGroupTeamItem[] {
  const cached = cachedTeamsByGroup.get(codGrupo);
  if (cached && cached.length > 0) return cached;
  return PRELOADED_GROUP_TEAMS[codGrupo] || [];
}

function inferProvinceFromCompName(name: string): string | undefined {
  const match = name.match(/\(([^)]+)\)/);
  if (match && match[1]) return match[1].trim();
  if (/m[aá]laga/i.test(name)) return 'Málaga';
  if (/sevilla/i.test(name)) return 'Sevilla';
  if (/c[aá]diz/i.test(name)) return 'Cádiz';
  if (/granada/i.test(name)) return 'Granada';
  if (/c[oó]rdoba|codoba/i.test(name)) return 'Córdoba';
  if (/ja[eé]n/i.test(name)) return 'Jaén';
  if (/almer[ií]a/i.test(name)) return 'Almería';
  if (/huelva/i.test(name)) return 'Huelva';
  return undefined;
}

/**
 * Descarga el listado de competiciones disponibles para la temporada indicada,
 * fusionándolo con el catálogo rápido pre-cargado para carga instantánea.
 */
export async function fetchAvailableCompetitions(
  temporada: string = DEFAULT_TEMPORADA
): Promise<FedCompetitionOption[]> {
  const mem = cachedCompetitionsBySeason.get(temporada);
  if (mem && mem.length > PRELOADED_COMPETITIONS.length) {
    return mem;
  }

  const byCode = new Map<string, FedCompetitionOption>();
  for (const item of PRELOADED_COMPETITIONS) {
    byCode.set(item.codCompeticion, { ...item });
  }

  try {
    const url = `https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=${encodeURIComponent(temporada)}`;
    const html = await fetchRfafHtmlDirect(url);
    const selectMatch = html.match(/<select[^>]*name=["']?competicion["']?[^>]*>([\s\S]*?)<\/select>/i);
    if (selectMatch) {
      const optMatches = [...selectMatch[1].matchAll(/<option[^>]*value=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/option>/gi)];
      for (const m of optMatches) {
        const codCompeticion = m[1].trim();
        const nombre = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!codCompeticion || codCompeticion === '0' || !nombre || nombre.startsWith('--')) continue;
        if (!byCode.has(codCompeticion)) {
          byCode.set(codCompeticion, {
            codCompeticion,
            nombre,
            provincia: inferProvinceFromCompName(nombre),
          });
        }
      }
    }
  } catch {
    // Si falla la red, devolvemos el catálogo pre-cargado instantáneo
  }

  const merged = Array.from(byCode.values());
  cachedCompetitionsBySeason.set(temporada, merged);
  return merged;
}

/**
 * Consulta los grupos disponibles para una competición (`<select name="grupo">`).
 */
export async function fetchGroupsForCompetition(
  codTemporada: string = DEFAULT_TEMPORADA,
  codCompeticion: string
): Promise<FedGroupOption[]> {
  if (!codCompeticion) return [];
  const cacheKey = `${codTemporada}:${codCompeticion}`;
  const mem = cachedGroupsByComp.get(cacheKey);
  if (mem && mem.length > 0) return mem;

  const preloaded = PRELOADED_COMPETITIONS.find(c => c.codCompeticion === codCompeticion)?.grupos;
  if (preloaded && preloaded.length > 0 && codTemporada === DEFAULT_TEMPORADA) {
    cachedGroupsByComp.set(cacheKey, preloaded);
    return preloaded;
  }

  try {
    const url = `https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=${encodeURIComponent(codTemporada)}&CodCompeticion=${encodeURIComponent(codCompeticion)}`;
    const html = await fetchRfafHtmlDirect(url);
    const grpSelect = html.match(/<select[^>]*name=["']?grupo["']?[^>]*>([\s\S]*?)<\/select>/i);
    if (grpSelect) {
      const groups: FedGroupOption[] = [];
      const optMatches = [...grpSelect[1].matchAll(/<option[^>]*value=["']?(\d+)["']?[^>]*>([\s\S]*?)<\/option>/gi)];
      for (const m of optMatches) {
        const codGrupo = m[1].trim();
        const nombre = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (!codGrupo || codGrupo === '0' || !nombre || nombre.startsWith('--')) continue;
        groups.push({ codGrupo, nombre });
      }
      if (groups.length > 0) {
        cachedGroupsByComp.set(cacheKey, groups);
        return groups;
      }
    }
  } catch {
    // fallback a preloaded
  }

  return preloaded || [];
}

/**
 * Consulta la clasificación o jornada de un grupo y devuelve la lista exacta de equipos participantes
 * con su `{ teamName, codigoEquipo }`.
 */
export async function fetchTeamsInGroup(
  codTemporada: string = DEFAULT_TEMPORADA,
  codCompeticion: string,
  codGrupo: string
): Promise<FedGroupTeamItem[]> {
  if (!codCompeticion || !codGrupo) return [];
  const mem = cachedTeamsByGroup.get(codGrupo);
  if (mem && mem.length > 0) return mem;

  const preloaded = PRELOADED_GROUP_TEAMS[codGrupo];
  if (preloaded && preloaded.length > 0 && codTemporada === DEFAULT_TEMPORADA) {
    cachedTeamsByGroup.set(codGrupo, preloaded);
    return preloaded;
  }

  const jornadaUrl = `https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodTemporada=${encodeURIComponent(codTemporada)}&CodCompeticion=${encodeURIComponent(codCompeticion)}&CodGrupo=${encodeURIComponent(codGrupo)}&CodJornada=1`;
  const standingsUrl = `https://www.rfaf.es/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codjornada=1&codcompeticion=${encodeURIComponent(codCompeticion)}&codgrupo=${encodeURIComponent(codGrupo)}&codtemporada=${encodeURIComponent(codTemporada)}`;

  try {
    const html = await fetchRfafHtmlDirect(jornadaUrl);
    let refs = extractTeamsFromFederationHtml(html);
    if (refs.length === 0) {
      const stHtml = await fetchRfafHtmlDirect(standingsUrl);
      refs = extractTeamsFromFederationHtml(stHtml);
    }
    if (refs.length > 0) {
      const items: FedGroupTeamItem[] = refs
        .map(r => ({ teamName: r.nombre, codigoEquipo: r.codigo }))
        .sort((a, b) => a.teamName.localeCompare(b.teamName, 'es', { sensitivity: 'base' }));
      cachedTeamsByGroup.set(codGrupo, items);
      return items;
    }
  } catch {
    // fallback a preloaded si existe
  }

  return preloaded || [];
}

export interface SyncAllCompetitionParams {
  teamId?: string;
  codTemporada: string;
  codCompeticion: string;
  codGrupo: string;
  codigoEquipo?: string;
  officialTeamName: string;
  competitionName: string;
  groupName: string;
  existingPlayers: Player[];
  unmatchedSanciones?: SancionCompactaUrl[];
  homeStadium?: string;
}

export interface SyncAllCompetitionResult {
  candidates: FedPlayerCandidate[];
  updatedPlayers: Player[];
  remainingUnmatched: SancionCompactaUrl[];
  addedPlayersCount: number;
  linkedPlayersCount: number;
  matches: FedMatchDayItem[];
  detectedClubs: string[];
  importedMatchesCount: number;
  createdRivalsCount: number;
  standings: FedStandingRow[];
  jornadaUrl: string;
  resolvedCodigoEquipo?: string;
}

/**
 * Sincroniza en 1 clic Plantilla, Calendario Completo/Rivales y Clasificación a partir de
 * los selectores de Competición, Grupo y Equipo (sin necesidad de pegar URLs).
 */
export async function syncAllCompetitionData(
  params: SyncAllCompetitionParams
): Promise<SyncAllCompetitionResult> {
  const {
    teamId,
    codTemporada = DEFAULT_TEMPORADA,
    codCompeticion,
    codGrupo,
    codigoEquipo,
    officialTeamName,
    competitionName,
    groupName,
    existingPlayers,
    unmatchedSanciones = [],
    homeStadium,
  } = params;

  const jornadaUrl = `https://www.rfaf.es/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=${encodeURIComponent(codCompeticion)}&CodGrupo=${encodeURIComponent(codGrupo)}&CodTemporada=${encodeURIComponent(codTemporada)}&CodJornada=1`;
  const calendarUrl = `https://www.rfaf.es/pnfg/NPcd/NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=${encodeURIComponent(codTemporada)}&codcompeticion=${encodeURIComponent(codCompeticion)}&codgrupo=${encodeURIComponent(codGrupo)}&CodJornada=1`;
  const standingsUrl = `https://www.rfaf.es/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codjornada=1&codcompeticion=${encodeURIComponent(codCompeticion)}&codgrupo=${encodeURIComponent(codGrupo)}&codtemporada=${encodeURIComponent(codTemporada)}`;

  // Resolver codigoEquipo si aún no lo teníamos
  let resolvedCodigoEquipo = codigoEquipo;
  if (!resolvedCodigoEquipo) {
    const groupTeams = await fetchTeamsInGroup(codTemporada, codCompeticion, codGrupo);
    const matched = groupTeams.find(t => clubsMatch(t.teamName, officialTeamName));
    if (matched?.codigoEquipo) {
      resolvedCodigoEquipo = matched.codigoEquipo;
    }
  }

  const squadSourceUrl = resolvedCodigoEquipo
    ? `https://www.rfaf.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo=${encodeURIComponent(resolvedCodigoEquipo)}`
    : jornadaUrl;

  const [squadRes, calRes, stRes] = await Promise.allSettled([
    fetchSquadFromFederationUrl(squadSourceUrl, officialTeamName, existingPlayers),
    fetchRfafHtmlDirect(calendarUrl),
    fetchRfafHtmlDirect(standingsUrl),
  ]);

  // 1. Procesar Plantilla
  let candidates: FedPlayerCandidate[] = [];
  let updatedPlayers: Player[] = existingPlayers;
  let remainingUnmatched: SancionCompactaUrl[] = unmatchedSanciones;
  let addedPlayersCount = 0;
  let linkedPlayersCount = 0;

  if (squadRes.status === 'fulfilled' && squadRes.value.candidates.length > 0) {
    candidates = squadRes.value.candidates;
    if (!resolvedCodigoEquipo && squadRes.value.matchedTeam?.codigo) {
      resolvedCodigoEquipo = squadRes.value.matchedTeam.codigo;
    }
    const applied = aplicarCandidatosValidadosAPlantilla(existingPlayers, candidates, unmatchedSanciones);
    updatedPlayers = applied.updatedPlayers;
    remainingUnmatched = applied.remainingUnmatched;
    addedPlayersCount = applied.addedCount;
    linkedPlayersCount = applied.linkedCount;
  }

  // 2. Procesar Calendario y Rivales
  let matches: FedMatchDayItem[] = [];
  let detectedClubs: string[] = [];
  let importedMatchesCount = 0;
  let createdRivalsCount = 0;

  if (calRes.status === 'fulfilled' && calRes.value) {
    const parsedCal = parseRfafCalendarFromHtmlOrText(calRes.value, officialTeamName);
    matches = parsedCal.matches;
    detectedClubs = parsedCal.detectedClubs;
    if (matches.length > 0 && teamId) {
      const compLabel = groupName ? `${competitionName} · ${groupName}` : competitionName;
      const imported = await importarCalendarioRfafEnPlan({
        teamId,
        clubRfaf: officialTeamName,
        competicion: compLabel,
        matches,
        detectedClubs,
        homeStadium,
      });
      importedMatchesCount = imported.importedMatchesCount;
      createdRivalsCount = imported.createdRivalsCount;
    }
  }

  // 3. Procesar Clasificación
  let standings: FedStandingRow[] = [];
  if (stRes.status === 'fulfilled' && stRes.value) {
    standings = parseRfafStandingsFromHtmlOrText(stRes.value);
    if (standings.length > 0) {
      await syncRivalsFromStandings(teamId, officialTeamName, standings);
    }
  }

  if (candidates.length === 0 && matches.length === 0 && standings.length === 0) {
    throw new Error('No se pudieron descargar datos del grupo seleccionado. Comprueba tu conexión e inténtalo de nuevo.');
  }

  return {
    candidates,
    updatedPlayers,
    remainingUnmatched,
    addedPlayersCount,
    linkedPlayersCount,
    matches,
    detectedClubs,
    importedMatchesCount,
    createdRivalsCount,
    standings,
    jornadaUrl,
    resolvedCodigoEquipo,
  };
}

