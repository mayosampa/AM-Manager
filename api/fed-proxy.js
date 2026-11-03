import { fetchFederationPage, FedProxyError } from './_fedProxyCore.js';

export const config = {
  maxDuration: 15,
};

/**
 * Vercel Serverless Function: GET /api/fed-proxy?url=<enlace de competición>
 * Devuelve el HTML (UTF-8) de una página pública de competición validada.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Método no permitido.' }));
    return;
  }

  const target =
    (req.query && typeof req.query.url === 'string' ? req.query.url : null) ||
    new URL(req.url || '', 'http://localhost').searchParams.get('url');

  try {
    const html = await fetchFederationPage(target);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.end(html);
  } catch (err) {
    const status = err instanceof FedProxyError ? err.status : 500;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: err?.message || 'Error inesperado leyendo la competición.' }));
  }
}
