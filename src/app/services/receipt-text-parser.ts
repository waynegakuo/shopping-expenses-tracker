import { ShoppingCategory } from '../models/expense.model';
import { ExtractedShoppingItem } from '../models/extracted-item.model';
import { ParsedReceiptOcr, ExtractedReceiptLineItem } from '../models/extracted-receipt.model';

const SKIP_LINE =
  /^(total|sub\s*total|vat|tax|change|cash|mpesa|m-?pesa|balance|receipt|thank|welcome|pin|etr|kra|date|time|qty|quantity|amount|kes|ksh|grand|net|gross|paid|tender|invoice|tel|phone|www|http|@|\*+|shopping\s*list|items?)/i;

const RECEIPT_SKIP_LINE =
  /^(total|sub\s*total|vat|tax|change|cash|mpesa|m-?pesa|balance|receipt|thank|welcome|pin|etr|kra|date|time|qty|quantity|amount|kes|ksh|grand|net|gross|paid|tender|invoice|tel|phone|www|http|@|\*+|item|description|unit|price|till|cashier|serve|welcome|member|card|visa|points|served\s*by)/i;

const AMOUNT =
  /([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)/;

const QTY_NAME_AMOUNT = new RegExp(
  `^(\\d+)\\s*[x×*@]\\s*(.+?)\\s+(?:KES|KSH)?\\s*${AMOUNT.source}\\s*$`,
  'i',
);

const NAME_QTY_AMOUNT = new RegExp(
  `^(.+?)\\s+(\\d+)\\s+(?:KES|KSH)?\\s*${AMOUNT.source}\\s*$`,
  'i',
);

const NAME_AMOUNT = new RegExp(
  `^(.+?)\\s+(?:KES|KSH)?\\s*${AMOUNT.source}\\s*$`,
  'i',
);

const TOTAL_LINE = /(?:grand\s*)?total\s*(?:KES|KSH)?\s*([\d,]+\.?\d*)/i;
const DATE_LINE = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/;

const MERCHANT_HINT =
  /supermarket|carrefour|naivas|quickmart|tuskys|chandarana|magunas|cleanshelf|shoprite|store|mart|kenya/i;

/** Parse supermarket receipt OCR text into line items with qty + amount. */
export function parseReceiptLineItemsText(text: string): ParsedReceiptOcr {
  const seen = new Set<string>();
  const lineItems: ExtractedReceiptLineItem[] = [];
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim());

  let suggestedTotal: number | undefined;
  let suggestedMerchant: string | undefined;
  let suggestedDate: string | undefined;

  for (const line of lines) {
    if (!line) {
      continue;
    }

    const totalMatch = line.match(TOTAL_LINE);
    if (totalMatch) {
      suggestedTotal = parseKesAmount(totalMatch[1]);
      continue;
    }

    if (!suggestedDate) {
      const dateMatch = line.match(DATE_LINE);
      if (dateMatch) {
        suggestedDate = normalizeDate(dateMatch[1]);
      }
    }

    if (!suggestedMerchant && MERCHANT_HINT.test(line) && line.length < 60) {
      suggestedMerchant = capitalizeWords(line.replace(/[@#|]+/g, ' ').trim());
    }

    if (line.length < 4 || RECEIPT_SKIP_LINE.test(line)) {
      continue;
    }

    const parsed = parseReceiptLine(line);
    if (!parsed) {
      continue;
    }

    const key = `${parsed.description.toLowerCase()}-${parsed.quantity}-${parsed.amountKes}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    lineItems.push({
      description: parsed.description,
      quantity: parsed.quantity,
      amountKes: parsed.amountKes,
      selected: true,
    });
  }

  if (!suggestedTotal && lineItems.length > 0) {
    suggestedTotal = lineItems.reduce((sum, item) => sum + item.amountKes, 0);
  }

  return { lineItems, suggestedTotal, suggestedMerchant, suggestedDate };
}

function parseReceiptLine(
  line: string,
): { description: string; quantity: number; amountKes: number } | null {
  let match = line.match(QTY_NAME_AMOUNT);
  if (match) {
    const quantity = Number.parseInt(match[1], 10);
    const description = cleanDescription(match[2]);
    const amountKes = parseKesAmount(match[3]);
    if (isValidLine(description, amountKes)) {
      return { description: capitalizeWords(description), quantity, amountKes };
    }
  }

  match = line.match(NAME_QTY_AMOUNT);
  if (match) {
    const description = cleanDescription(match[1]);
    const quantity = Number.parseInt(match[2], 10);
    const amountKes = parseKesAmount(match[3]);
    if (isValidLine(description, amountKes) && quantity < 100) {
      return { description: capitalizeWords(description), quantity, amountKes };
    }
  }

  match = line.match(NAME_AMOUNT);
  if (match) {
    const description = cleanDescription(match[1]);
    const amountKes = parseKesAmount(match[2]);
    if (isValidLine(description, amountKes)) {
      return { description: capitalizeWords(description), quantity: 1, amountKes };
    }
  }

  return null;
}

function isValidLine(description: string, amountKes: number): boolean {
  return description.length >= 2 && amountKes > 0 && amountKes < 5_000_000;
}

function cleanDescription(value: string): string {
  return value.replace(QTY_PREFIX, '').replace(BULLET_PREFIX, '').replace(/[@#|]+/g, ' ').trim();
}

function parseKesAmount(raw: string): number {
  const normalized = raw.replace(/[,\s]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function normalizeDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const parts = raw.split(/[\/\-]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (c > 999) {
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    if (a > 999) {
      return `${a}-${String(b).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function capitalizeWords(value: string): string {
  return value
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : ''))
    .join(' ');
}

const PRICE_SUFFIX =
  /^(.*?)\s+(?:KES|KSH|K\.?\s?)?([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2}|\d+)\s*$/i;

const QTY_PREFIX = /^\d+\s*[x×*.\)]\s*/i;
const BULLET_PREFIX = /^[-•*]\s*/;

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

/** Parse a handwritten/printed shopping list — names only, prices ignored. */
export function parseShoppingListText(text: string): ExtractedShoppingItem[] {
  const seen = new Set<string>();
  const items: ExtractedShoppingItem[] = [];

  for (const rawLine of text.split('\n')) {
    let line = rawLine.replace(/\s+/g, ' ').trim();
    line = line.replace(BULLET_PREFIX, '').replace(QTY_PREFIX, '');

    if (line.length < 2 || SKIP_LINE.test(line)) {
      continue;
    }

    // Strip trailing price if present — we only want the item name
    const priceMatch = line.match(PRICE_SUFFIX);
    const name = (priceMatch ? priceMatch[1] : line).replace(/[@#|]+/g, ' ').trim();

    if (name.length < 2 || /^\d+$/.test(name)) {
      continue;
    }

    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(name)) {
      continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    items.push({
      name: capitalizeWords(name),
      category: inferCategory(name),
      selected: true,
    });
  }

  return items;
}

/** @deprecated Use parseShoppingListText for shopping list scans. Kept for receipt OCR. */
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

    const name = match[1].replace(QTY_PREFIX, '').replace(/[@#|]+/g, ' ').trim();
    if (name.length < 2) {
      continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    items.push({
      name: capitalizeWords(name),
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
