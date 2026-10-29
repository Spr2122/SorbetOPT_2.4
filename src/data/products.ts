// Каталог хранится в products.json — этот файл управляется приложением SorbentOpt Manager.
// Здесь данные проверяются при сборке: если в JSON ошибка, сборка остановится
// с понятным сообщением, а не выложит на сайт сломанную страницу.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import raw from './products.json';

export type ProductStatus = 'draft' | 'published';

/** Запись в products.json (как хранит приложение). */
export type ProductRecord = {
  id: string;
  status: ProductStatus;
  slug: string;
  oldSlugs: string[];
  name: string;
  shortName: string;
  fraction: string;
  packaging: string;
  /** Цена в рублях за единицу; null = «По запросу». */
  price: number | null;
  priceUnit: string;
  minimum: string;
  image: string;
  description: string;
  applications: string[];
  /** Пусто = заголовок и описание страницы формируются автоматически. */
  seoTitle: string;
  seoDescription: string;
};

/** Товар в виде, удобном для шаблонов. */
export type Product = ProductRecord & {
  /** Готовая строка цены: «12 000 ₽/т» или «По запросу». */
  priceText: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const nbsp = '\u00a0';

export function formatPrice(price: number | null, unit: string): string {
  if (price === null || price === undefined) return 'По запросу';
  const n = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(price).replace(/\s/g, nbsp);
  return unit ? `${n}${nbsp}${unit}` : `${n}${nbsp}₽`;
}

function validate(records: ProductRecord[]): void {
  const problems: string[] = [];
  const slugs = new Map<string, string>();
  const ids = new Set<string>();
  const need = (p: ProductRecord, field: keyof ProductRecord) => {
    const v = p[field];
    if (typeof v !== 'string' || !v.trim()) problems.push(`«${p.slug || p.name || p.id}»: поле «${String(field)}» не заполнено`);
  };
  for (const p of records) {
    const label = p.slug || p.name || p.id || '(без названия)';
    if (!p.id || ids.has(p.id)) problems.push(`«${label}»: пустой или повторяющийся id`);
    ids.add(p.id);
    if (!['draft', 'published'].includes(p.status)) problems.push(`«${label}»: неизвестный статус «${p.status}»`);
    if (!SLUG_RE.test(p.slug ?? '')) problems.push(`«${label}»: некорректный slug (только латиница, цифры и дефисы)`);
    for (const f of ['name', 'shortName', 'fraction', 'packaging', 'minimum', 'description'] as const) {
      if (p.status === 'published') need(p, f);
    }
    if (p.price !== null && (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0)) {
      problems.push(`«${label}»: цена должна быть неотрицательным числом или null`);
    }
    if (p.status === 'published') {
      if (!p.image?.startsWith('/')) problems.push(`«${label}»: путь к изображению должен начинаться с «/»`);
      else if (!existsSync(join(process.cwd(), 'public', p.image))) problems.push(`«${label}»: файл изображения не найден: public${p.image}`);
      if (!Array.isArray(p.applications) || p.applications.length === 0) problems.push(`«${label}»: не указаны области применения`);
    }
    for (const s of [p.slug, ...(p.oldSlugs ?? [])]) {
      if (!s) continue;
      if (slugs.has(s) && slugs.get(s) !== p.id) problems.push(`Адрес «${s}» используется у двух товаров`);
      slugs.set(s, p.id);
    }
  }
  if (problems.length) {
    throw new Error('Ошибки в src/data/products.json:\n - ' + problems.join('\n - '));
  }
}

const file = raw as { schemaVersion: number; products: ProductRecord[] };
if (file.schemaVersion !== 2) throw new Error(`products.json: неподдерживаемая версия схемы ${file.schemaVersion}`);
validate(file.products);

/** Все записи, включая черновики (нужно для редиректов в astro.config.mjs). */
export const allProducts: ProductRecord[] = file.products;

/** Только опубликованные товары, в порядке, заданном в приложении. */
export const products: Product[] = file.products
  .filter((p) => p.status === 'published')
  .map((p) => ({ ...p, priceText: formatPrice(p.price, p.priceUnit) }));

/** «от 6 500 ₽/т» для главной страницы — вычисляется из каталога. */
const priced = products.filter((p) => p.price !== null);
export const minPriceText: string = priced.length
  ? formatPrice(Math.min(...priced.map((p) => p.price as number)), priced[0].priceUnit)
  : 'По запросу';
