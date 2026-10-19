/**
 * Test helpers for what the app says. Only imported by tests.
 */
import en from '../i18n/en.json';

/**
 * Words that turn a text into an upsell or a "coming soon", in either language, as whole words:
 * Pro, free plan, paid, price, plans, buy, subscribe, "when it's ready".
 */
export const PURCHASE_WORDS =
  /\b(?:pro|free|gratis|ready|listo|soon|pronto|paid|pago|cobr\w*|upgrade|plans?|planes|premium|prices?|precios?|buy|compra\w*|purchase\w*|subscri\w*|suscri\w*)\b/i;

/** Every dictionary key that holds a string (lists such as month names are left out). */
export function stringKeys(): string[] {
  const walk = (o: unknown, prefix: string): string[] =>
    typeof o === 'string'
      ? [prefix]
      : o && typeof o === 'object' && !Array.isArray(o)
        ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => walk(v, prefix ? `${prefix}.${k}` : k))
        : [];
  return walk(en, '');
}

/** The text a rendered screen shows, without the markup. */
export function visibleText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
