/**
 * Resolución segura del escudo del club para documentos PDF (anti-CORS).
 *
 * Fast-path: si ya es un Data URL base64 se usa tal cual. Si es una URL remota se descarga
 * (directa o vía proxies) y se convierte a base64 para que el canvas/PDF no se "contamine".
 * Nunca lanza: devuelve null cuando no hay escudo o no se puede obtener.
 */

export interface CrestImage {
  /** PNG en base64 (siempre PNG, compatible con jsPDF). */
  dataUrl: string;
  width: number;
  height: number;
}

const FETCH_TIMEOUT_MS = 6000;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Devuelve el escudo como Data URL base64 o null. Comprueba existencia/tipo antes de operar sobre el string. */
export async function resolveCrestDataUrl(crestUrl?: string | null): Promise<string | null> {
  if (!crestUrl || typeof crestUrl !== 'string') return null;
  const url = crestUrl.trim();
  if (!url) return null;

  if (url.startsWith('data:image')) return url;

  const urlsToTry = [
    url,
    `https://wsrv.nl/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const candidate of urlsToTry) {
    try {
      const res = await fetchWithTimeout(candidate);
      if (!res.ok) continue;
      const blob = await res.blob();
      // Algunos proxies devuelven páginas de error con 200: se descartan.
      if (blob.type.startsWith('text/') || blob.type === 'application/json') continue;
      return await blobToDataUrl(blob);
    } catch (e) {
      // probar el siguiente proxy
    }
  }
  return null;
}

/** Rasteriza un Data URL a PNG y devuelve sus dimensiones (soporta webp/svg/jpg que jsPDF no admite). */
function rasterizeToPng(dataUrl: string): Promise<CrestImage | null> {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), FETCH_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      try {
        const width = img.naturalWidth || 300;
        const height = img.naturalHeight || 300;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = dataUrl;
  });
}

/** Escudo listo para incrustar en jsPDF (PNG + dimensiones), o null si no hay / falla. */
export async function resolveCrestForPdf(crestUrl?: string | null): Promise<CrestImage | null> {
  const dataUrl = await resolveCrestDataUrl(crestUrl);
  if (!dataUrl) return null;
  return rasterizeToPng(dataUrl);
}
