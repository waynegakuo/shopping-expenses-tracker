import { Injectable, computed, effect, signal } from '@angular/core';
import {
  INITIAL_MOCK_RECEIPTS,
  INITIAL_MOCK_SHOPPING_LIST,
} from '../data/mock-data';
import {
  DeductibleCategory,
  PaymentMethod,
  PersistedState,
  Receipt,
  ReceiptLineItem,
  ShoppingCategory,
  ShoppingItem,
  VatRate,
} from '../models/expense.model';

const STORAGE_KEY = 'kenya-expense-tracker-v1';

@Injectable({ providedIn: 'root' })
export class ExpenseStoreService {
  readonly shoppingItems = signal<ShoppingItem[]>([]);
  readonly receipts = signal<Receipt[]>([]);

  readonly totalEstimatedKes = computed(() =>
    this.shoppingItems().reduce((sum, item) => sum + item.estimatedCostKes, 0),
  );

  readonly totalGatheredKes = computed(() =>
    this.shoppingItems()
      .filter((item) => item.completed)
      .reduce((sum, item) => sum + item.estimatedCostKes, 0),
  );

  readonly pendingItemCount = computed(
    () => this.shoppingItems().filter((item) => !item.completed).length,
  );

  readonly completedItems = computed(() =>
    this.shoppingItems().filter((item) => item.completed),
  );

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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  addShoppingItem(
    name: string,
    category: ShoppingCategory,
    estimatedCostKes: number,
  ): void {
    const item: ShoppingItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      category,
      estimatedCostKes,
      completed: false,
    };
    this.shoppingItems.update((items) => [...items, item]);
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
    return created;
  }

  updateReceipt(id: string, patch: Partial<Receipt>): void {
    this.receipts.update((list) =>
      list.map((receipt) => (receipt.id === id ? { ...receipt, ...patch } : receipt)),
    );
  }

  removeReceipt(id: string): void {
    this.receipts.update((list) => list.filter((receipt) => receipt.id !== id));
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
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        this.shoppingItems.set(parsed.shoppingItems ?? INITIAL_MOCK_SHOPPING_LIST);
        this.receipts.set(parsed.receipts ?? INITIAL_MOCK_RECEIPTS);
        return;
      }
    } catch {
      // fall through to seed mock data
    }
    this.shoppingItems.set(structuredClone(INITIAL_MOCK_SHOPPING_LIST));
    this.receipts.set(structuredClone(INITIAL_MOCK_RECEIPTS));
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
