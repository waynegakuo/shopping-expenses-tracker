import { ShoppingCategory } from '../models/expense.model';
import { ExtractedShoppingItem } from '../models/extracted-item.model';

const SKIP_LINE =
  /^(total|sub\s*total|vat|tax|change|cash|mpesa|m-?pesa|balance|receipt|thank|welcome|pin|etr|kra|date|time|qty|quantity|amount|kes|ksh|grand|net|gross|paid|tender|invoice|tel|phone|www|http|@|\*+)/i;

const PRICE_SUFFIX =
  /^(.*?)\s+(?:KES|KSH|K\.?\s?)?([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)\s*$/i;

const QTY_PREFIX = /^\d+\s*[x×*]\s*/i;

const CATEGORY_KEYWORDS: Record<ShoppingCategory, RegExp[]> = {
  Groceries: [
    /milk|bread|rice|flour|sugar|tea|coffee|snack|grocery|fruit|vegetable|meat|egg|oil|salt|pantry|water|juice|soap|detergent|toilet/i,
  ],
  'Tech & Hardware': [
    /usb|cable|adapter|charger|laptop|phone|keyboard|mouse|monitor|hdmi|ssd|ram|desk\s*mat|ergonomic|hardware|tech|router|wifi/i,
  ],
  'Office Supplies': [
    /notebook|marker|pen|pencil|paper|staple|folder|file|whiteboard|office|printer|ink|envelope|clip/i,
  ],
  Utilities: [
    /airtime|electric|water|internet|data|bundle|utility|subscription|power|token|kplc|safaricom|airtel/i,
  ],
};

export function parseReceiptText(text: string): ExtractedShoppingItem[] {
  const seen = new Set<string>();
  const items: ExtractedShoppingItem[] = [];

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (line.length < 4 || SKIP_LINE.test(line)) {
      continue;
    }

    const match = line.match(PRICE_SUFFIX);
    if (!match) {
      continue;
    }

    let name = match[1].replace(QTY_PREFIX, '').replace(/[@#|]+/g, ' ').trim();
    const cost = parseKesAmount(match[2]);

    if (name.length < 2 || cost <= 0 || cost > 5_000_000) {
      continue;
    }

    // Skip lines that look like dates or receipt numbers only
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(name)) {
      continue;
    }

    const key = `${name.toLowerCase()}-${cost}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    items.push({
      name: capitalizeWords(name),
      estimatedCostKes: cost,
      category: inferCategory(name),
      selected: true,
    });
  }

  return items;
}

export function inferCategory(name: string): ShoppingCategory {
  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS) as [
    ShoppingCategory,
    RegExp[],
  ][]) {
    if (patterns.some((pattern) => pattern.test(name))) {
      return category;
    }
  }
  return 'Groceries';
}

function parseKesAmount(raw: string): number {
  const normalized = raw.replace(/[,\s]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function capitalizeWords(value: string): string {
  return value
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}
