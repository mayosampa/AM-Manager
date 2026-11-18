import { fetchFederationPage, FedProxyError } from './_fedProxyCore.js';

export const config = {
  maxDuration: 15,
};

function isAllowedCorsOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol === 'https:') {
      return (
        host === 'ammanager.es' ||
        host === 'www.ammanager.es' ||
        host.endsWith('.ammanager.es') ||
        host.endsWith('.vercel.app')
      );
    }
    if (parsed.protocol === 'http:') {
      return host === 'localhost' || host === '127.0.0.1';
    }
    return false;
  } catch {
    return false;
  }
}

async function readPostUrl(req) {
  if (req.body && typeof req.body === 'object' && typeof req.body.url === 'string') {
    return req.body.url;
  }
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      if (parsed && typeof parsed.url === 'string') return parsed.url;
    } catch {
      return null;
    }
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 8192) return null;
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return parsed && typeof parsed.url === 'string' ? parsed.url : null;
  } catch {
    return null;
  }
}

/**
 * Vercel Serverless Function: GET | POST /api/fed-proxy
 * Devuelve el HTML (UTF-8) de una página pública de competición validada (anti-SSRF).
 */
export default async function handler(req, res) {
  const origin = req.headers?.origin;
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (origin && isAllowedCorsOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = origin && !isAllowedCorsOrigin(origin) ? 403 : 204;
    res.end();
    return;
  }

  if (origin && !isAllowedCorsOrigin(origin)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Origen no autorizado.' }));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Método no permitido.' }));
    return;
  }

  const target =
    req.method === 'POST'
      ? await readPostUrl(req)
      : (req.query && typeof req.query.url === 'string' ? req.query.url : null) ||
        new URL(req.url || '', 'http://localhost').searchParams.get('url');

  try {
    const html = await fetchFederationPage(target);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.end(html);
  } catch (err) {
    const isKnown = err instanceof FedProxyError;
    res.statusCode = isKnown ? err.status : 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: isKnown ? err.message : 'Error inesperado leyendo la competición.',
      })
    );
  }
}
