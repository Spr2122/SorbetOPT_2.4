import type { APIRoute } from 'astro';
import { absoluteUrl } from '../utils/paths';

// Тестовые копии (PUBLIC_NOINDEX=1) закрываются от индексации, боевой сайт — открыт.
export const GET: APIRoute = () => {
  const closed = import.meta.env.PUBLIC_NOINDEX === '1';
  const body = closed
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl('/sitemap-index.xml')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
