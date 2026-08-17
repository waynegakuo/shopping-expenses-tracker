import { PurchaseRecord, PriceIncrease, ItemPriceInsight } from '../models/expense.model';

export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPriceInsight(
  itemName: string,
  history: PurchaseRecord[],
): ItemPriceInsight {
  const key = normalizeItemName(itemName);
  const records = history
    .filter((record) => record.normalizedName === key)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (records.length === 0) {
    return { increased: false, decreased: false, isNew: true };
  }

  const latest = records[0];
  const previous = records[1];

  if (!previous) {
    return {
      lastPrice: latest.amountKes,
      lastDate: latest.date,
      lastMerchant: latest.merchantName,
      increased: false,
      decreased: false,
      isNew: true,
    };
  }

  const changeKes = latest.amountKes - previous.amountKes;
  const changePercent =
    previous.amountKes > 0 ? Math.round((changeKes / previous.amountKes) * 100) : 0;

  return {
    lastPrice: latest.amountKes,
    lastDate: latest.date,
    lastMerchant: latest.merchantName,
    previousPrice: previous.amountKes,
    changeKes,
    changePercent,
    increased: changeKes > 0,
    decreased: changeKes < 0,
    isNew: false,
  };
}

export function getPriceIncreases(history: PurchaseRecord[]): PriceIncrease[] {
  const byName = new Map<string, PurchaseRecord[]>();

  for (const record of history) {
    const existing = byName.get(record.normalizedName) ?? [];
    existing.push(record);
    byName.set(record.normalizedName, existing);
  }

  const increases: PriceIncrease[] = [];

  for (const records of byName.values()) {
    const sorted = records.sort((a, b) => b.date.localeCompare(a.date));
    if (sorted.length < 2) {
      continue;
    }

    const current = sorted[0];
    const previous = sorted[1];

    if (current.amountKes <= previous.amountKes) {
      continue;
    }

    const changeKes = current.amountKes - previous.amountKes;
    increases.push({
      itemName: current.itemName,
      category: current.category,
      currentPrice: current.amountKes,
      previousPrice: previous.amountKes,
      changeKes,
      changePercent:
        previous.amountKes > 0 ? Math.round((changeKes / previous.amountKes) * 100) : 0,
      currentDate: current.date,
      previousDate: previous.date,
      merchantName: current.merchantName,
    });
  }

  return increases.sort((a, b) => b.changeKes - a.changeKes);
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
  });
}
