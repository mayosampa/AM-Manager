import { Player, SancionCompactaUrl } from '../types';

export type { SancionCompactaUrl };

/**
 * Normaliza un texto eliminando tildes, signos de puntuación/comas y espacios redundantes.
 */
export function normalizeRfafText(text?: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,.;:()\-_/]+/g, ' ')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Invierte el formato RFAF "APELLIDO1 APELLIDO2, NOMBRE" a "NOMBRE APELLIDO1 APELLIDO2" normalizado.
 */
function invertRfafName(rfafName: string): {
  fullNormalized: string;
  invertedNormalized: string;
  nombreTokens: string[];
  apellidoTokens: string[];
  allTokens: string[];
} {
  const parts = (rfafName || '').split(',');
  const apellidosRaw = parts[0] || '';
  const nombreRaw = parts[1] || '';

  const apellidoTokens = normalizeRfafText(apellidosRaw).split(' ').filter(Boolean);
  const nombreTokens = normalizeRfafText(nombreRaw).split(' ').filter(Boolean);
  const allTokens = [...nombreTokens, ...apellidoTokens];

  return {
    fullNormalized: normalizeRfafText(rfafName),
    invertedNormalized: [...nombreTokens, ...apellidoTokens].join(' '),
    nombreTokens,
    apellidoTokens,
    allTokens,
  };
}

/**
 * Decodifica el parámetro `qa_payload` (Base64 UTF-8) enviado por QuintaAmarilla en la URL.
 */
export function decodificarQaPayload(base64Str: string): SancionCompactaUrl[] {
  if (!base64Str || !base64Str.trim()) return [];
  try {
    let raw = base64Str.trim();
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Ya venía decodificado por URLSearchParams
    }
    const normalizedB64 = raw
      .replace(/ /g, '+')
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padLen = (4 - (normalizedB64.length % 4)) % 4;
    const padded = normalizedB64 + '='.repeat(padLen);

    const binaryStr = atob(padded);
    const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
    const jsonStr = new TextDecoder('utf-8').decode(bytes);
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SancionCompactaUrl =>
        item && typeof item === 'object' && typeof item.j === 'string'
    );
  } catch (err) {
    console.error('[QuintaAmarillaSync] Error decodificando qa_payload:', err);
    return [];
  }
}

/**
 * Aplica los datos de una sanción/ciclo RFAF de QuintaAmarilla sobre un jugador concreto.
 */
export function aplicarSancionAPlayer(player: Player, item: SancionCompactaUrl): Player {
  const ciclo = typeof item.ciclo === 'number' ? item.ciclo : (player.rfafCycleCards ?? 0);
  const motivoFormatted =
    item.det?.trim() ||
    (item.mot
      ? `${item.mot}${item.art ? ` (Art. ${item.art})` : ''}`
      : item.art
      ? `Sanción federativa (Art. ${item.art})`
      : 'Sanción federativa vigente');

  if (item.sanc === 1) {
    return {
      ...player,
      isSuspended: true,
      suspensionReason: motivoFormatted,
      isCarriedOverSuspension: item.arr === 1,
      rfafCycleCards: ciclo,
      rfafName: player.rfafName || item.j,
    };
  }

  return {
    ...player,
    isSuspended: false,
    suspensionReason: undefined,
    isCarriedOverSuspension: false,
    rfafCycleCards: ciclo,
    rfafName: player.rfafName || item.j,
  };
}

/**
 * Busca el mejor jugador de la plantilla que coincida con un registro de sanción RFAF.
 */
function findMatchingPlayerIndex(
  players: Player[],
  item: SancionCompactaUrl,
  alreadyMatchedIndices: Set<number>
): number {
  const targetNorm = normalizeRfafText(item.j);
  if (!targetNorm) return -1;

  // 1. Match exacto normalizado contra player.rfafName
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    if (!p || p.isActive === false) continue;
    if (p.rfafName && normalizeRfafText(p.rfafName) === targetNorm) {
      return i;
    }
  }

  const { invertedNormalized, nombreTokens, apellidoTokens, allTokens } = invertRfafName(item.j);

  // 2. Match exacto contra nombre invertido ("NOMBRE APELLIDO1 APELLIDO2") o directo
  for (let i = 0; i < players.length; i++) {
    if (alreadyMatchedIndices.has(i)) continue;
    const p = players[i];
    if (!p || p.isActive === false) continue;
    const pNorm = normalizeRfafText(p.name);
    if (!pNorm) continue;
    if (pNorm === invertedNormalized || pNorm === targetNorm) {
      return i;
    }
  }

  // 3. Match por tokens: todos los tokens del nombre del jugador en AM Manager (>= 2 tokens, o nombre + 1er apellido) están en el nombre RFAF
  let bestIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < players.length; i++) {
    if (alreadyMatchedIndices.has(i)) continue;
    const p = players[i];
    if (!p || p.isActive === false) continue;
    const pTokens = normalizeRfafText(p.name)
      .split(' ')
      .filter(t => t.length >= 2);
    if (pTokens.length === 0) continue;

    const allIncluded = pTokens.every(pt => allTokens.includes(pt));
    if (allIncluded && pTokens.length >= 2) {
      const score = pTokens.length * 10;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
      continue;
    }

    // Coincidencia de Nombre de pila + Primer apellido
    if (
      pTokens.length >= 2 &&
      nombreTokens.length > 0 &&
      apellidoTokens.length > 0 &&
      pTokens[0] === nombreTokens[0] &&
      pTokens.includes(apellidoTokens[0])
    ) {
      const score = 18;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
  }

  // 4. Si el jugador tiene un único token (apodo o nombre único en la plantilla) y coincide exactamente con el nombre de pila o primer apellido único en la plantilla
  if (bestIdx === -1) {
    const candidates: number[] = [];
    for (let i = 0; i < players.length; i++) {
      if (alreadyMatchedIndices.has(i)) continue;
      const p = players[i];
      if (!p || p.isActive === false) continue;
      const pTokens = normalizeRfafText(p.name).split(' ').filter(Boolean);
      if (pTokens.length === 1 && pTokens[0].length >= 3) {
        const token = pTokens[0];
        if (nombreTokens.includes(token) || apellidoTokens[0] === token) {
          candidates.push(i);
        }
      }
    }
    if (candidates.length === 1) {
      bestIdx = candidates[0];
    }
  }

  return bestIdx;
}

/**
 * Consolida registros repetidos de un mismo jugador en el payload (por ejemplo cuando qa_jornada=TODAS),
 * priorizando sancionadoEstaJornada (sanc === 1) y la jornada más reciente.
 */
function consolidateSancionesByPlayer(sancionesClub: SancionCompactaUrl[]): SancionCompactaUrl[] {
  const byPlayer = new Map<string, SancionCompactaUrl>();
  const sorted = [...(sancionesClub || [])].sort((a, b) => (a.jor || 0) - (b.jor || 0));

  for (const item of sorted) {
    const key = normalizeRfafText(item.j);
    if (!key) continue;
    const prev = byPlayer.get(key);
    if (!prev) {
      byPlayer.set(key, { ...item });
    } else {
      const sanc: 0 | 1 = prev.sanc === 1 || item.sanc === 1 ? 1 : 0;
      const chosen = item.sanc === 1 ? item : prev.sanc === 1 ? prev : item;
      byPlayer.set(key, {
        ...chosen,
        sanc,
        ciclo: Math.max(prev.ciclo || 0, item.ciclo || 0),
        jor: Math.max(prev.jor || 0, item.jor || 0),
      });
    }
  }

  return Array.from(byPlayer.values());
}

/**
 * Sincroniza la plantilla de AM Manager con el array de sanciones consolidadas de QuintaAmarilla.
 */
export function sincronizarPlantillaConQuintaAmarilla(
  players: Player[],
  sancionesClub: SancionCompactaUrl[]
): {
  updatedPlayers: Player[];
  unmatchedSanciones: SancionCompactaUrl[];
} {
  const consolidated = consolidateSancionesByPlayer(sancionesClub);

  // 1. Resetear sanciones RFAF anteriores en los jugadores antes de aplicar el nuevo corte
  const updatedPlayers: Player[] = (players || []).map(p => {
    if (!p) return p;
    const hadRfafData =
      Boolean(p.rfafName) ||
      Boolean(p.isCarriedOverSuspension) ||
      typeof p.rfafCycleCards === 'number' ||
      Boolean(p.suspensionReason?.includes('Art.')) ||
      Boolean(p.suspensionReason?.includes('Cumple'));

    if (hadRfafData) {
      return {
        ...p,
        isSuspended: false,
        suspensionReason: undefined,
        isCarriedOverSuspension: false,
      };
    }
    return { ...p };
  });

  const unmatchedSanciones: SancionCompactaUrl[] = [];
  const matchedIndices = new Set<number>();

  // 2. Cruzar cada sanción del club con la plantilla
  for (const item of consolidated) {
    const matchIdx = findMatchingPlayerIndex(updatedPlayers, item, matchedIndices);
    if (matchIdx !== -1) {
      matchedIndices.add(matchIdx);
      updatedPlayers[matchIdx] = aplicarSancionAPlayer(updatedPlayers[matchIdx], item);
    } else {
      unmatchedSanciones.push(item);
    }
  }

  return {
    updatedPlayers,
    unmatchedSanciones,
  };
}

/**
 * URL base de QuintaAmarilla para consultas directas o enlace externo.
 */
export function getQuintaAmarillaBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_QUINTA_AMARILLA_URL;
  return (envUrl ? String(envUrl) : 'http://localhost:5173').replace(/\/+$/, '');
}

/**
 * Descarga sanciones del club desde QuintaAmarilla (/sanciones.json o /api/sanciones) si no vienen en qa_payload.
 */
export async function fetchSancionesFromQuintaAmarilla(params: {
  clubRfaf: string;
  competicion?: string;
  grupo?: string;
}): Promise<SancionCompactaUrl[]> {
  const baseUrl = getQuintaAmarillaBaseUrl();
  const clubTarget = normalizeRfafText(params.clubRfaf);
  if (!clubTarget) return [];

  const endpoints = [
    `${baseUrl}/api/sanciones?club=${encodeURIComponent(params.clubRfaf)}${
      params.competicion ? `&competicion=${encodeURIComponent(params.competicion)}` : ''
    }${params.grupo ? `&grupo=${encodeURIComponent(params.grupo)}` : ''}`,
    `${baseUrl}/sanciones.json`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.sanciones)
        ? data.sanciones
        : Array.isArray(data?.items)
        ? data.items
        : [];

      const mapped: SancionCompactaUrl[] = [];
      for (const row of rawList) {
        if (!row || typeof row !== 'object') continue;
        // Si ya viene en formato SancionCompactaUrl
        if (typeof row.j === 'string' && !row.equipo && !row.club) {
          mapped.push(row as SancionCompactaUrl);
          continue;
        }
        const rowClub = normalizeRfafText(row.club || row.equipo || '');
        if (rowClub && rowClub !== clubTarget && !rowClub.includes(clubTarget) && !clubTarget.includes(rowClub)) {
          continue;
        }
        const jugador = String(row.j ?? row.jugador ?? row.nombre ?? '').trim();
        if (!jugador) continue;
        mapped.push({
          j: jugador,
          lic: String(row.lic ?? row.tipoLicencia ?? 'A'),
          art: String(row.art ?? row.articulo ?? ''),
          mot: String(row.mot ?? row.motivo ?? ''),
          ciclo: Number(row.ciclo ?? row.tarjetasCiclo ?? 0) || 0,
          sanc: row.sanc === 1 || row.sancionadoEstaJornada === true ? 1 : 0,
          arr: row.arr === 1 || row.esSancionArrastrada === true ? 1 : 0,
          det: row.det ?? row.detalleCumplimiento ?? undefined,
          jor: Number(row.jor ?? row.jornada ?? 0) || 0,
        });
      }
      if (mapped.length > 0) return mapped;
    } catch {
      // intenta siguiente endpoint
    }
  }

  return [];
}
