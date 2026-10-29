// Сайт может жить не в корне домена (например, GitHub Pages: /repo-name/). Префикс задаётся
// переменной BASE_PATH при сборке. withBase() добавляет его ко всем внутренним ссылкам.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/** Абсолютный URL внутри сайта (для canonical, Open Graph, JSON-LD). Домен берётся из SITE_URL при сборке. */
export function absoluteUrl(path: string): string {
  return new URL(withBase(path), import.meta.env.SITE || 'https://sorbentopt.ru').toString();
}
