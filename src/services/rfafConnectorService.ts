import {
  Player,
  RfafMatchDayItem,
  RfafPlayerCandidate,
  RfafStandingRow,
  SancionCompactaUrl,
} from '../types';
import { getGroupForPosition } from '../features/squad/domain/positions';
import { db } from './db';
import { createRivalTeam, loadAndSyncRivals, rivalsDbKey, clearRivalsCache } from '../features/rivals/services/rivalsService';
import { normalizeRfafText } from './quintaAmarillaSync';

/**
 * Normaliza el nombre de un club eliminando prefijos/sufijos genéricos (C.D., U.D., C.F., A.D., S.D.)
 * para facilitar el cruce entre AM Manager y las tablas oficiales de la RFAF.
 */
export function normalizeClubIdentity(name?: string): string {
  const base = normalizeRfafText(name);
  if (!base) return '';
  const stopWords = new Set(['CD', 'UD', 'CF', 'AD', 'SD', 'CP', 'AT', 'ATLETICO', 'CLUB', 'DEPORTIVO', 'FUTBOL', 'BALOMPIE', 'SENIOR']);
  const tokens = base.split(' ').filter(t => t && !stopWords.has(t));
  return tokens.length > 0 ? tokens.join(' ') : base;
}

export function clubsMatch(clubA?: string, clubB?: string): boolean {
  const normA = normalizeRfafText(clubA);
  const normB = normalizeRfafText(clubB);
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

  // Tomar el primer apellido (incluyendo partículas como "DE LA", "DEL", "SAN")
  let primerApellidoWords: string[] = [];
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

/**
 * Descarga el HTML de una página oficial RFAF (rfaf.es / universorfaf.es / lapreferente.com)
 * usando cadena de proxies CORS en cliente y decodificando automáticamente UTF-8 o ISO-8859-15.
 */
export async function fetchRfafHtmlDirect(targetUrl: string): Promise<string> {
  const cleanUrl = (targetUrl || '').trim();
  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    throw new Error('Introduce una URL válida que comience por https://');
  }

  const proxyUrls = [
    `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(cleanUrl)}`,
  ];

  for (const proxyUrl of proxyUrls) {
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

      if (text && text.trim().length > 80) {
        return text;
      }
    } catch {
      // probar siguiente proxy
    }
  }

  throw new Error(
    'La web de la RFAF requiere sesión activa o bloqueó la conexión directa. Puedes copiar y pegar el contenido directamente en el cuadro inferior.'
  );
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

  // 1. Match por rfafName ya guardado
  for (const p of existingPlayers) {
    if (!p || p.isActive === false || usedIds.has(p.id)) continue;
    if (p.rfafName && normalizeRfafText(p.rfafName) === normTarget) {
      return p;
    }
  }

  const suggestedNorm = normalizeRfafText(formatearNombreDeportivoDesdeRfaf(rfafName));
  const allTokens = normTarget.split(' ').filter(t => t.length >= 2);

  // 2. Match por nombre deportivo sugerido o tokens contenidos
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
 * Extrae candidatos de plantilla desde HTML de RFAF (NFG_VisEquipos) o texto pegado (listado de actas / plantilla RFAF),
 * cruzándolos con los jugadores actuales del equipo.
 */
export function parseRfafSquadFromHtmlOrText(
  rawInput: string,
  existingPlayers: Player[]
): RfafPlayerCandidate[] {
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
    // Ignorar cabeceras comunes de tablas RFAF
    const badHeaders = ['NOMBRE', 'JUGADOR', 'APELLIDOS', 'POSICION', 'DORSAL', 'LICENCIA', 'EDAD', 'TARJETAS', 'PARTIDOS', 'ENTRENADOR', 'DELEGADO'];
    if (badHeaders.includes(norm)) return;
    seenNames.add(norm);
    extracted.push({ rfafName: cleaned, number, position: pos });
  };

  const trimmed = (rawInput || '').trim();
  if (trimmed.includes('<table') || trimmed.includes('<tr') || trimmed.includes('<a')) {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      const rows = Array.from(doc.querySelectorAll('tr'));
      for (const tr of rows) {
        const cells = Array.from(tr.querySelectorAll('td, th')).map(c => (c.textContent || '').replace(/\s+/g, ' ').trim());
        const nameCell = cells.find(c => /^[A-ZÁÉÍÓÚÑÜ\s\-]{3,},\s*[A-ZÁÉÍÓÚÑÜ\s\-]{2,}$/i.test(c));
        if (nameCell) {
          const numCell = cells.find(c => /^\d{1,2}$/.test(c));
          const posCell = cells.find(c => /(portero|defensa|medio|centrocampista|delantero)/i.test(c));
          pushCandidate(nameCell, numCell ? Number(numCell) : undefined, posCell);
        }
      }
      if (extracted.length === 0) {
        const links = Array.from(doc.querySelectorAll('a'));
        for (const a of links) {
          const txt = (a.textContent || '').replace(/\s+/g, ' ').trim();
          if (/^[A-ZÁÉÍÓÚÑÜ\s\-]{3,},\s*[A-ZÁÉÍÓÚÑÜ\s\-]{2,}$/i.test(txt)) {
            pushCandidate(txt);
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

      // Buscar patrón "APELLIDO1 APELLIDO2, NOMBRE" dentro de la línea
      const rfafRegex = /([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s\-]{2,},\s*[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s\-]{1,})/i;
      const match = cleanLine.match(rfafRegex);
      if (match) {
        const numMatch = cleanLine.match(/(?:^|\|\s*)(\d{1,2})(?:\s*\||\s+|-)/);
        const posMatch = cleanLine.match(/\b(POR|DFC|LD|LI|MCD|MC|MCO|ED|EI|DC|Portero|Defensa|Medio|Centrocampista|Delantero)\b/i);
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
 * Construye candidatos iniciales a partir de los jugadores que ya tienen rfafName o sanciones pendientes de QuintaAmarilla.
 */
export function buildCandidatesFromCurrentTeam(
  existingPlayers: Player[],
  unmatchedSanciones: SancionCompactaUrl[] = []
): RfafPlayerCandidate[] {
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
): RfafPlayerCandidate[] {
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
      id: `rfaf_cand_${idx}_${Math.random().toString(36).slice(2, 7)}`,
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
 * Actualiza los jugadores existentes vinculados y crea fichas nuevas para los nuevos jugadores.
 */
export function aplicarCandidatosValidadosAPlantilla(
  existingPlayers: Player[],
  candidates: RfafPlayerCandidate[],
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

    // Crear nuevo jugador en la plantilla
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
 * Extrae jornadas del calendario y clubes rivales desde HTML de la RFAF (NFG_CmpJornada / NFG_VisEquipos)
 * o desde texto/tablas pegadas por el entrenador.
 */
export function parseRfafCalendarFromHtmlOrText(
  rawInput: string,
  clubRfaf?: string
): {
  matches: RfafMatchDayItem[];
  detectedClubs: string[];
} {
  const allMatches: RfafMatchDayItem[] = [];
  const clubsSet = new Set<string>();

  const registerClub = (name: string) => {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (clean.length >= 3 && !/^\d+$/.test(clean) && !/jornada|fecha|hora|campo/i.test(clean)) {
      clubsSet.add(clean);
    }
  };

  let plainText = (rawInput || '').trim();
  if (plainText.includes('<table') || plainText.includes('<tr') || plainText.includes('<div')) {
    try {
      const doc = new DOMParser().parseFromString(plainText, 'text/html');
      const extractedLines: string[] = [];
      doc.querySelectorAll('tr, h3, h4, h5, caption, .jornada').forEach(el => {
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) extractedLines.push(txt);
      });
      if (extractedLines.length > 0) {
        plainText = extractedLines.join('\n');
      }
    } catch {
      // usar texto plano original
    }
  }

  const lines = plainText.split(/\r?\n/).map(l => l.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  let currentJornada = 1;
  let currentDate = '';

  for (const line of lines) {
    // Detectar cabecera de Jornada: "Jornada 4 (12/10/2026)" o "JORNADA 4"
    const jorHeader = line.match(/\b(?:jornada|jor\.?|j)\s*(\d{1,2})\b/i);
    const dateInLine = normalizeRfafDate(line);

    if (jorHeader && line.length < 45 && !line.includes(' - ') && !line.includes(' vs ')) {
      currentJornada = Number(jorHeader[1]);
      if (dateInLine) currentDate = dateInLine;
      continue;
    }

    if (jorHeader) {
      currentJornada = Number(jorHeader[1]);
    }
    if (dateInLine) {
      currentDate = dateInLine;
    }

    // Limpiar prefijos de jornada y fecha en la línea para aislar "LOCAL [GOLES] - [GOLES] VISITANTE"
    let matchSegment = line
      .replace(/\b(?:jornada|jor\.?|j)\s*\d{1,2}\b[:\-|]?/gi, '')
      .replace(/\b\d{1,2}[-/]\d{1,2}[-/](?:20\d{2}|\d{2})\b/g, '')
      .replace(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g, '')
      .trim();

    const timeMatch = matchSegment.match(/\b(\d{1,2}:\d{2})\b/);
    const hora = timeMatch ? timeMatch[1] : undefined;
    if (hora) {
      matchSegment = matchSegment.replace(hora, '').trim();
    }

    // Patrón 1: Con marcador numérico "EQUIPO LOCAL 2 - 1 EQUIPO VISITANTE"
    const scoredMatch = matchSegment.match(/^([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"\-()]{3,}?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"\-()]{3,})$/);
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
          fecha: dateInLine || currentDate || new Date().toISOString().split('T')[0],
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

    // Patrón 2: Partido sin disputar "EQUIPO LOCAL - EQUIPO VISITANTE" o "EQUIPO LOCAL vs EQUIPO VISITANTE"
    const pendingMatch = matchSegment.match(/^([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"()]{3,}?)\s+(?:[-–]|vs\.?|VS)\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"()]{3,})$/);
    if (pendingMatch) {
      const local = pendingMatch[1].replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();
      const visitante = pendingMatch[2].replace(/^[|\-:\s]+|[|\-:\s]+$/g, '').trim();

      if (local && visitante && !clubsMatch(local, visitante)) {
        registerClub(local);
        registerClub(visitante);
        allMatches.push({
          jornada: currentJornada,
          fecha: dateInLine || currentDate || new Date().toISOString().split('T')[0],
          hora,
          local,
          visitante,
          jugado: false,
        });
        if (!jorHeader) currentJornada++;
      }
    }
  }

  // Si se indicó clubRfaf y hay partidos donde participa nuestro club, filtramos los partidos de nuestro club
  // pero mantenemos TODOS los clubes detectados en el grupo para el directorio de Rivales & Scouting.
  const targetClub = (clubRfaf || '').trim();
  const filteredMatches =
    targetClub && allMatches.some(m => clubsMatch(m.local, targetClub) || clubsMatch(m.visitante, targetClub))
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
 * Importa los partidos del calendario RFAF en `season_plan` y registra automáticamente todos los rivales
 * del grupo en el directorio de `Rivales & Scouting`.
 */
export async function importarCalendarioRfafEnPlan(params: {
  teamId: string;
  clubRfaf: string;
  competicion: string;
  matches: RfafMatchDayItem[];
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
      ? `${competicion || 'Liga RFAF'} · J${m.jornada}`
      : competicion || 'Liga RFAF';

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

  // Sincronizar y dar de alta todos los clubes rivales del grupo en Rivales & Scouting
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
 * Parsea la tabla de Clasificación RFAF desde HTML (NFG_CmpClasificacion) o texto pegado de RFAF / Universo RFAF.
 */
export function parseRfafStandingsFromHtmlOrText(rawInput: string): RfafStandingRow[] {
  const rows: RfafStandingRow[] = [];
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return [];

  let lines: string[] = [];

  if (trimmed.includes('<table') || trimmed.includes('<tr')) {
    try {
      const doc = new DOMParser().parseFromString(trimmed, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('td'))
          .map(td => (td.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length >= 6) {
          lines.push(cells.join(' | '));
        }
      }
    } catch {
      // fallback a líneas de texto
    }
  }

  if (lines.length === 0) {
    lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  }

  for (const line of lines) {
    const clean = line.replace(/\t+/g, ' ').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
    // Buscar fila tipo: "1 C.D. ÁLORA 38 15 12 2 1 34 11" (o con Puntos al principio o al final)
    const match = clean.match(
      /^(\d{1,2})[ºª.\-)]?\s+([A-ZÁÉÍÓÚÑÜa-záéíóúñü0-9.\s'"\-()]{3,}?)\s+(\d{1,3})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})(?:\s+(\d{1,3})\s+(\d{1,3}))?/
    );
    if (!match) continue;

    const posicion = Number(match[1]);
    const equipo = match[2].trim();
    const n1 = Number(match[3]);
    const n2 = Number(match[4]);
    const n3 = Number(match[5]);
    const n4 = Number(match[6]);
    const n5 = Number(match[7]);
    const n6 = match[8] !== undefined ? Number(match[8]) : 0;
    const n7 = match[9] !== undefined ? Number(match[9]) : 0;

    // En RFAF/Universo RFAF el orden habitual es: Puntos, PJ, PG, PE, PP, GF, GC
    // pero en algunas tablas es: PJ, PG, PE, PP, GF, GC, Puntos. Lo detectamos comprobando si PJ == PG + PE + PP:
    let puntos = n1;
    let pj = n2;
    let pg = n3;
    let pe = n4;
    let pp = n5;
    let gf = n6;
    let gc = n7;

    if (n1 === n2 + n3 + n4 && n2 * 3 + n3 !== n1) {
      // Formato: PJ PG PE PP GF GC PTS
      pj = n1;
      pg = n2;
      pe = n3;
      pp = n4;
      gf = n5;
      gc = n6;
      puntos = n7 || pg * 3 + pe;
    }

    const formMatches = clean.match(/\b([VEDGWL])\b/gi);
    const ultimos5 = formMatches
      ? (formMatches
          .slice(-5)
          .map(ch => {
            const u = ch.toUpperCase();
            if (u === 'V' || u === 'G' || u === 'W') return 'V';
            if (u === 'E' || u === 'D') return u === 'E' ? 'E' : 'D';
            return 'D';
          }) as ('V' | 'E' | 'D')[])
      : undefined;

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
      ultimos5,
    });
  }

  return rows.sort((a, b) => a.posicion - b.posicion);
}

/**
 * Busca la fila de clasificación correspondiente a un equipo o rival.
 */
export function findStandingForClub(
  standings: RfafStandingRow[] | undefined,
  clubName?: string
): RfafStandingRow | undefined {
  if (!standings || standings.length === 0 || !clubName) return undefined;
  return standings.find(row => clubsMatch(row.equipo, clubName));
}

/**
 * Da de alta en Rivales & Scouting todos los clubes presentes en la tabla de clasificación RFAF.
 */
export async function syncRivalsFromStandings(
  teamId: string | undefined,
  clubRfaf: string,
  rows: RfafStandingRow[]
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
