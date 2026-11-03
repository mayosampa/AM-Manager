import { fetchFederationPage, FedProxyError } from './_fedProxyCore.js';

/**
 * Vercel Serverless Function: GET /api/fed-proxy?url=<enlace de competición>
 * Devuelve el HTML (UTF-8) de una página pública de competición validada.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  const target = new URL(req.url, 'http://localhost').searchParams.get('url');

  try {
    const html = await fetchFederationPage(target);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Caché en el edge para no repetir peticiones idénticas a la federación.
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.status(200).send(html);
  } catch (err) {
    const status = err instanceof FedProxyError ? err.status : 500;
    res.status(status).json({ error: err?.message || 'Error inesperado leyendo la competición.' });
  }
}
