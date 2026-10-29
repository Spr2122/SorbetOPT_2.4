// Контакты, реквизиты и параметры прайс-листа берутся из settings.json —
// этот файл редактирует приложение SorbentOpt Manager (раздел «Контент сайта»).
// Имена констант сохранены, чтобы шаблоны не менялись.
import raw from './settings.json';

export type ContactId = 'phone' | 'telegram' | 'whatsapp' | 'max' | 'email';
/** Тексты шапки и подвала, которые можно заменить из приложения. Пусто/нет ключа = стандартный текст. */
export type TextKey = 'headerBrand' | 'headerTagline' | 'headerCta' | 'footerBrand' | 'footerTagline' | 'footerAbout'
  | 'footerRequisites' | 'footerDisclaimer' | 'footerCopyright' | 'footerPolicyLabel';
type Optional = { hiddenContacts?: ContactId[]; texts?: Partial<Record<TextKey, string>>; priceDownload?: boolean };

export type SiteSettings = typeof raw & Optional & { pageTexts?: Record<string, string> };
export const settings: SiteSettings = raw as SiteSettings;

// Скрытые в приложении контакты нигде на сайте не показываются и не проверяются.
const hidden = new Set<ContactId>(settings.hiddenContacts ?? []);
export const isShown = (id: ContactId) => !hidden.has(id);

/** Свой текст из приложения или стандартный. */
export function customText(key: TextKey, fallback: string): string {
  const v = settings.texts?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function required(key: keyof SiteSettings) {
  const v = settings[key];
  if (v === undefined || v === null || v === '') throw new Error(`settings.json: не заполнено поле «${String(key)}»`);
}
(['manufacturerName', 'manufacturerCity', 'ownerName', 'priceListDate'] as const).forEach(required);
if (isShown('phone')) required('phone');
if (isShown('telegram')) required('telegram');
if (isShown('email')) required('email');
if (isShown('phone') && !/^\+\d{10,15}$/.test(settings.phone)) throw new Error('settings.json: телефон должен быть в формате +79991234567');
if (!/^\d{4}-\d{2}-\d{2}$/.test(settings.priceListDate)) throw new Error('settings.json: дата прайса должна быть в формате ГГГГ-ММ-ДД');

/** +79991234567 → +7 (999) 123-45-67 (для российских номеров). */
function formatPhone(e164: string): string {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+7 (${m[1]}) ${m[2]}-${m[3]}-${m[4]}` : e164;
}
function formatDateRu(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) + ' года';
}

// Контакты сайта. Форм обратной связи нет — сайт не собирает персональные данные,
// все обращения идут напрямую в мессенджеры/по телефону/почте.
export const TELEGRAM_HANDLE = `@${settings.telegram.replace(/^@/, '')}`;
export const TELEGRAM_URL = `https://t.me/${settings.telegram.replace(/^@/, '')}`;
export const WHATSAPP_NUMBER = settings.whatsapp || settings.phone.replace(/\D/g, '');
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const MAX_HANDLE = settings.maxHandle;
export const MAX_URL = settings.maxUrl;
export const PHONE_E164 = settings.phone;
export const PHONE_DISPLAY = formatPhone(settings.phone);
export const PHONE_URL = `tel:${settings.phone}`;
export const EMAIL = settings.email;
export const EMAIL_URL = `mailto:${EMAIL}`;

const WHATSAPP_DISPLAY = settings.whatsapp ? formatPhone(`+${settings.whatsapp}`) : PHONE_DISPLAY;

/** Только показываемые контакты, в порядке отображения. */
export const CONTACT_CHANNELS: Array<{ id: ContactId; label: string; value: string; url: string }> = [
  { id: 'phone', label: 'Позвонить', value: PHONE_DISPLAY, url: PHONE_URL },
  { id: 'telegram', label: 'Telegram', value: TELEGRAM_HANDLE, url: TELEGRAM_URL },
  { id: 'whatsapp', label: 'WhatsApp', value: WHATSAPP_DISPLAY, url: WHATSAPP_URL },
  { id: 'max', label: 'MAX', value: MAX_HANDLE, url: MAX_URL },
  { id: 'email', label: 'Email', value: EMAIL, url: EMAIL_URL },
].filter((c) => isShown(c.id as ContactId) && (c.id !== 'max' || Boolean(MAX_URL))) as Array<{ id: ContactId; label: string; value: string; url: string }>;

if (CONTACT_CHANNELS.length === 0) throw new Error('settings.json: скрыты все способы связи — на сайте должен остаться хотя бы один контакт');

/** Куда ведёт кнопка «Связаться с нами» без JavaScript (с JS открывается окно выбора). */
export const CONTACT_FALLBACK_URL = (CONTACT_CHANNELS.find((c) => c.id === 'telegram') ?? CONTACT_CHANNELS[0]).url;

// Производитель, по договору с которым осуществляются поставки.
// Поставка идёт напрямую с завода-производителя по ценам завода (цены на сайте — по заводскому прайс-листу).
export const MANUFACTURER_NAME = settings.manufacturerName;
export const MANUFACTURER_CITY = settings.manufacturerCity;
// Имя константы историческое: используется в шапке, подвале, прайсе и в приложении-менеджере.
export const REPRESENTATIVE_LINE = `Оптовая продукция завода ${MANUFACTURER_NAME} · заводские цены · доставка отдельно` ;

// Реквизиты владельца сайта.
export const OWNER_NAME = settings.ownerName;
export const OWNER_INN = settings.ownerInn;
export const OWNER_OGRNIP = settings.ownerOgrnip;
export const OWNER_LINE = `${OWNER_NAME} | ИНН ${OWNER_INN} | ОГРНИП ${OWNER_OGRNIP}`;

// Оговорка: сайт — приглашение делать оферты (ст. 437 ГК РФ), а не публичная оферта.
export const SITE_DISCLAIMER = 'Информация на сайте носит ознакомительный характер и не является публичной офертой (ст. 437 ГК РФ). Цены на продукцию приведены по прайс-листу производителя, включают НДС и не включают доставку. Наличие, характеристики, объём партии, условия и итоговую стоимость подтверждает производитель при согласовании заказа.';
export const SUPPLY_NOTE = `СорбентОпт помогает подобрать продукцию ${MANUFACTURER_NAME} и согласовать условия поставки. Договор поставки покупатель заключает непосредственно с производителем; оплату за продукцию получает производитель. Цены указаны по заводскому прайс-листу без наценки со стороны СорбентОпт. Доставка организуется и оформляется производителем, её стоимость рассчитывается отдельно.`;

// Метаданные актуального прайс-листа.
export const PRICE_LIST_DATE = formatDateRu(settings.priceListDate);
export const PRICE_VAT_NOTE = `Цены указаны с учётом НДС ${settings.vatPercent}%, по заводскому прайс-листу для объёма от ${settings.volumeFromTons} до ${settings.volumeToTons} тонн. Стоимость доставки в цену продукции не входит и рассчитывается отдельно. Актуальность цены подтверждается при согласовании заказа.`;


// Тексты шапки и подвала: свой текст из приложения или стандартный.
export const HEADER_BRAND = customText('headerBrand', 'СорбентОпт');
export const HEADER_TAGLINE = customText('headerTagline', REPRESENTATIVE_LINE);
export const HEADER_CTA = customText('headerCta', 'Связаться с нами');
export const FOOTER_BRAND = customText('footerBrand', 'СорбентОпт');
export const FOOTER_TAGLINE = customText('footerTagline', REPRESENTATIVE_LINE);
export const FOOTER_ABOUT = customText('footerAbout', 'Информация о глауконитовой продукции производителя для промышленных предприятий и оптовых покупателей. Помогаем подобрать позицию и согласовать условия поставки.');
/** Строки блока «Контакты и реквизиты» (перенос строки в приложении = новая строка на сайте). */
export const FOOTER_REQUISITES: string[] = customText('footerRequisites', [OWNER_LINE, SUPPLY_NOTE].join('\n')).split(/\r?\n/);
export const FOOTER_DISCLAIMER = customText('footerDisclaimer', SITE_DISCLAIMER);
export const FOOTER_COPYRIGHT = customText('footerCopyright', `© 2026 СорбентОпт · ${OWNER_NAME}`);
export const FOOTER_POLICY_LABEL = customText('footerPolicyLabel', 'Политика обработки данных');

// Скачивание прайс-листа (Excel). Отключается в приложении: «Контент сайта → Прайс-лист».
export const PRICE_DOWNLOAD_ENABLED = settings.priceDownload !== false;
export const PRICE_DOWNLOAD_NAME = 'sorbentopt-price-list';
export const PRICE_DOWNLOAD_PATH = `/price/${PRICE_DOWNLOAD_NAME}.xlsx`;
export const PRICE_DOWNLOAD_FILENAME = `Прайс-лист_СорбентОпт_${settings.priceListDate}.xlsx`;

/** Текст раздела, редактируемый в SorbentOpt Manager. Пустое значение оставляет текст шаблона. */
export function pageText(key: string, fallback: string): string {
  const value = settings.pageTexts?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}
