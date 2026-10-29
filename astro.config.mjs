import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// Адрес и префикс пути задаются переменными окружения при сборке:
//   SITE_URL  — по умолчанию https://sorbentopt.ru
//   BASE_PATH — по умолчанию «/» (для GitHub Pages: /имя-репозитория)
// Приложение SorbentOpt Manager передаёт их само, вручную ничего менять не нужно.
const site = (process.env.SITE_URL || 'https://sorbentopt.ru').replace(/\/+$/, '');
const rawBase = process.env.BASE_PATH || '/';
const base = '/' + rawBase.replace(/^\/+|\/+$/g, '');

// Если у товара изменили адрес (slug), старый адрес ведёт на новый — SEO и ссылки не теряются.
const redirects = {};
try {
  const data = JSON.parse(readFileSync(new URL('./src/data/products.json', import.meta.url), 'utf8'));
  for (const p of data.products) {
    if (p.status !== 'published') continue;
    for (const old of p.oldSlugs ?? []) redirects[`/catalog/${old}`] = `${base === '/' ? '' : base}/catalog/${p.slug}/`;
  }
} catch {
  // Ошибки данных покажет сама сборка (src/data/products.ts) с понятным текстом.
}

export default defineConfig({
  site,
  base,
  redirects,
  output: 'static',
  integrations: [sitemap()],
  build: { format: 'directory' }
});
