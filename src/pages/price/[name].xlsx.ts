import type { APIRoute, GetStaticPaths } from 'astro';
import { products } from '../../data/products';
import {
  CONTACT_CHANNELS, OWNER_LINE, PRICE_DOWNLOAD_ENABLED, PRICE_DOWNLOAD_NAME, PRICE_LIST_DATE, PRICE_VAT_NOTE,
  REPRESENTATIVE_LINE, SITE_DISCLAIMER, SUPPLY_NOTE, settings
} from '../../data/site';
import { buildXlsx, type Row } from '../../utils/xlsx';

// Прайс-лист для скачивания (Excel). Собирается вместе с сайтом из тех же товаров, цен и даты,
// что показаны на страницах, поэтому всегда совпадает с сайтом. Скрытые в приложении контакты в файл не попадают.
export const getStaticPaths: GetStaticPaths = () => (PRICE_DOWNLOAD_ENABLED ? [{ params: { name: PRICE_DOWNLOAD_NAME } }] : []);

const WIDTHS = [5, 52, 20, 24, 14, 9, 22];
const CONTACT_NAMES: Record<string, string> = { phone: 'Телефон', telegram: 'Telegram', whatsapp: 'WhatsApp', max: 'MAX', email: 'Email' };

/** Высота объединённой строки: Excel не подгоняет её сам, поэтому считаем по длине текста. */
const lines = (text: string, perLine: number) => text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
const WIDE = WIDTHS.reduce((a, b) => a + b, 0);

export const GET: APIRoute = () => {
  const rows: Row[] = [];
  const wide = (text: string, style: 'title' | 'subtitle' | 'note', lineHeight: number, perLine = WIDE * 1.1) =>
    rows.push({ cells: [{ v: text, s: style }], merge: true, height: Math.max(lineHeight, lines(text, perLine) * lineHeight) });

  wide('СорбентОпт — прайс-лист на глауконитовую продукцию', 'title', 26);
  wide(`Прайс-лист актуален на ${PRICE_LIST_DATE}`, 'subtitle', 18);
  wide(REPRESENTATIVE_LINE, 'subtitle', 18);
  const contacts = CONTACT_CHANNELS.map((c) => `${CONTACT_NAMES[c.id] ?? c.label}: ${c.value}`).join('  ·  ');
  if (contacts) wide(contacts, 'subtitle', 18);
  rows.push({ cells: [{ v: '' }], height: 8 });

  const headerRow = rows.length + 1;
  rows.push({
    height: 34,
    cells: ['№', 'Наименование', 'Фракция', 'Упаковка', `Цена с НДС ${settings.vatPercent}%`, 'Ед. изм.', 'Объём по прайс-листу'].map((v) => ({ v, s: 'header' as const }))
  });
  products.forEach((p, i) => {
    const price = p.price === null
      ? { v: 'По запросу', s: 'textCenter' as const }
      : { v: p.price, s: Number.isInteger(p.price) ? ('int' as const) : ('money' as const) };
    rows.push({
      height: Math.max(22, lines(p.name, 50) * 16 + 6),
      cells: [{ v: i + 1, s: 'textCenter' }, { v: p.name, s: 'text' }, { v: p.fraction, s: 'text' }, { v: p.packaging, s: 'text' }, price, { v: p.priceUnit || '₽', s: 'textCenter' }, { v: p.minimum, s: 'text' }]
    });
  });

  rows.push({ cells: [{ v: '' }], height: 8 });
  for (const note of [PRICE_VAT_NOTE, SITE_DISCLAIMER, SUPPLY_NOTE, OWNER_LINE]) wide(note, 'note', 13, WIDE * 1.25);

  const body = buildXlsx({ name: 'Прайс-лист', widths: WIDTHS, rows, headerRow });
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  });
};
