import { Injectable, computed, effect, signal } from '@angular/core';
import {
  INITIAL_MOCK_PURCHASE_HISTORY,
  INITIAL_MOCK_RECEIPTS,
  INITIAL_MOCK_SHOPPING_LIST,
} from '../data/mock-data';
import {
  DeductibleCategory,
  ItemPriceInsight,
  PaymentMethod,
  PersistedState,
  PriceIncrease,
  PurchaseRecord,
  Receipt,
  ReceiptLineItem,
  ShoppingCategory,
  ShoppingItem,
  VatRate,
} from '../models/expense.model';
import { inferCategory } from './receipt-text-parser';
import {
  formatMonthLabel,
  getMonthKey,
  getPriceIncreases,
  getPriceInsight,
  normalizeItemName,
} from './price-tracking.utils';

const STORAGE_KEY = 'kenya-expense-tracker-v2';

@Injectable({ providedIn: 'root' })
export class ExpenseStoreService {
  readonly shoppingItems = signal<ShoppingItem[]>([]);
  readonly receipts = signal<Receipt[]>([]);
  readonly purchaseHistory = signal<PurchaseRecord[]>([]);

  readonly pendingItemCount = computed(
    () => this.shoppingItems().filter((item) => !item.completed).length,
  );

  readonly completedItems = computed(() =>
    this.shoppingItems().filter((item) => item.completed),
  );

  readonly currentMonthKey = computed(() => getMonthKey(new Date().toISOString().slice(0, 10)));

  readonly currentMonthLabel = computed(() => formatMonthLabel(this.currentMonthKey()));

  readonly currentMonthSpendKes = computed(() =>
    this.receipts()
      .filter((receipt) => getMonthKey(receipt.date) === this.currentMonthKey())
      .reduce((sum, receipt) => sum + receipt.totalKes, 0),
  );

  readonly priceIncreases = computed(() => getPriceIncreases(this.purchaseHistory()));

  readonly totalSpendKes = computed(() =>
    this.receipts().reduce((sum, receipt) => sum + receipt.totalKes, 0),
  );

  readonly totalDeductibleSpendKes = computed(() =>
    this.receipts()
      .filter((receipt) => receipt.isTaxDeductible)
      .reduce((sum, receipt) => sum + receipt.totalKes, 0),
  );

  readonly estimatedVatClaimKes = computed(() =>
    this.receipts()
      .filter((receipt) => receipt.isTaxDeductible && receipt.vatRate === '16%')
      .reduce((sum, receipt) => {
        const vatPortion = receipt.totalKes - receipt.totalKes / 1.16;
        return sum + vatPortion;
      }, 0),
  );

  readonly categoryBreakdown = computed(() => {
    const breakdown = new Map<DeductibleCategory, number>();
    for (const receipt of this.receipts()) {
      if (!receipt.isTaxDeductible || !receipt.deductibleCategory) {
        continue;
      }
      const current = breakdown.get(receipt.deductibleCategory) ?? 0;
      breakdown.set(receipt.deductibleCategory, current + receipt.totalKes);
    }
    return breakdown;
  });

  constructor() {
    this.hydrateFromStorage();
    effect(() => {
      const state: PersistedState = {
        shoppingItems: this.shoppingItems(),
        receipts: this.receipts(),
        purchaseHistory: this.purchaseHistory(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  getItemPriceInsight(itemName: string): ItemPriceInsight {
    return getPriceInsight(itemName, this.purchaseHistory());
  }

  addShoppingItem(name: string, category: ShoppingCategory): void {
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category,
      completed: false,
    };
    this.shoppingItems.update((items) => [...items, item]);
  }

  addShoppingItems(entries: { name: string; category: ShoppingCategory }[]): number {
    const newItems: ShoppingItem[] = entries.map((entry) => ({
      id: crypto.randomUUID(),
      name: entry.name.trim(),
      category: entry.category,
      completed: false,
    }));
    this.shoppingItems.update((items) => [...items, ...newItems]);
    return newItems.length;
  }

  toggleShoppingItem(id: string): void {
    this.shoppingItems.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item,
      ),
    );
  }

  removeShoppingItem(id: string): void {
    this.shoppingItems.update((items) => items.filter((item) => item.id !== id));
  }

  addReceipt(receipt: Omit<Receipt, 'id'>): Receipt {
    const created: Receipt = { ...receipt, id: `rec-${crypto.randomUUID().slice(0, 8)}` };
    this.receipts.update((list) => [created, ...list]);
    this.recordPurchasesFromReceipt(created);
    return created;
  }

  updateReceipt(id: string, patch: Partial<Receipt>): void {
    this.receipts.update((list) =>
      list.map((receipt) => (receipt.id === id ? { ...receipt, ...patch } : receipt)),
    );
  }

  removeReceipt(id: string): void {
    this.receipts.update((list) => list.filter((receipt) => receipt.id !== id));
    this.purchaseHistory.update((history) =>
      history.filter((record) => record.receiptId !== id),
    );
  }

  matchReceiptToShopping(
    receiptId: string,
    shoppingItemIds: string[],
    lineItems?: ReceiptLineItem[],
  ): void {
    this.receipts.update((list) =>
      list.map((receipt) =>
        receipt.id === receiptId
          ? {
              ...receipt,
              matchedShoppingItemIds: shoppingItemIds,
              ...(lineItems ? { items: lineItems } : {}),
            }
          : receipt,
      ),
    );
  }

  resetToMockData(): void {
    this.shoppingItems.set(structuredClone(INITIAL_MOCK_SHOPPING_LIST));
    this.receipts.set(structuredClone(INITIAL_MOCK_RECEIPTS));
    this.purchaseHistory.set(structuredClone(INITIAL_MOCK_PURCHASE_HISTORY));
  }

  private recordPurchasesFromReceipt(receipt: Receipt): void {
    const matchedIds = receipt.matchedShoppingItemIds ?? [];
    const shoppingItems = this.shoppingItems();

    const records: PurchaseRecord[] = receipt.items.map((line) => {
      const normalized = normalizeItemName(line.description);
      const matchedItem = shoppingItems.find(
        (item) =>
          matchedIds.includes(item.id) &&
          normalizeItemName(item.name) === normalized,
      ) ?? shoppingItems.find(
        (item) => matchedIds.includes(item.id),
      );

      return {
        id: crypto.randomUUID(),
        itemName: line.description,
        normalizedName: normalized,
        category: matchedItem?.category ?? inferCategory(line.description),
        amountKes: line.amountKes,
        merchantName: receipt.merchantName,
        date: receipt.date,
        receiptId: receipt.id,
        shoppingItemId: matchedItem?.id,
      };
    });

    this.purchaseHistory.update((history) => [...records, ...history]);
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        this.shoppingItems.set(parsed.shoppingItems ?? INITIAL_MOCK_SHOPPING_LIST);
        this.receipts.set(parsed.receipts ?? INITIAL_MOCK_RECEIPTS);
        this.purchaseHistory.set(parsed.purchaseHistory ?? INITIAL_MOCK_PURCHASE_HISTORY);
        return;
      }

      // Migrate from v1 storage
      const legacyRaw = localStorage.getItem('kenya-expense-tracker-v1');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw) as {
          shoppingItems?: (ShoppingItem & { estimatedCostKes?: number })[];
          receipts?: Receipt[];
        };
        this.shoppingItems.set(
          (legacy.shoppingItems ?? INITIAL_MOCK_SHOPPING_LIST).map(({ id, name, category, completed }) => ({
            id,
            name,
            category,
            completed,
          })),
        );
        this.receipts.set(legacy.receipts ?? INITIAL_MOCK_RECEIPTS);
        this.purchaseHistory.set(INITIAL_MOCK_PURCHASE_HISTORY);
        return;
      }
    } catch {
      // fall through to seed mock data
    }
    this.shoppingItems.set(structuredClone(INITIAL_MOCK_SHOPPING_LIST));
    this.receipts.set(structuredClone(INITIAL_MOCK_RECEIPTS));
    this.purchaseHistory.set(structuredClone(INITIAL_MOCK_PURCHASE_HISTORY));
  }
}

export type NewReceiptDraft = {
  merchantName: string;
  kraPin: string;
  etrNumber: string;
  date: string;
  totalKes: number;
  paymentMethod: PaymentMethod;
  vatRate: VatRate;
  isTaxDeductible: boolean;
  deductibleCategory?: DeductibleCategory;
  items: ReceiptLineItem[];
  matchedShoppingItemIds: string[];
};
