export type ShoppingCategory =
  | 'Groceries'
  | 'Tech & Hardware'
  | 'Office Supplies'
  | 'Utilities';

export type PaymentMethod = 'M-Pesa' | 'Card' | 'Cash';

export type VatRate = '16%' | '0%' | 'Exempt';

export type DeductibleCategory =
  | 'Home Office'
  | 'Professional Tools'
  | 'Office Supplies'
  | 'Cloud & Tools'
  | 'Hardware'
  | 'Business Meals';

/** Active list item — no price until checkout at the supermarket. */
export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  completed: boolean;
}

/** Recorded price from a completed shopping run (receipt). */
export interface PurchaseRecord {
  id: string;
  itemName: string;
  normalizedName: string;
  category: ShoppingCategory;
  amountKes: number;
  merchantName: string;
  date: string;
  receiptId: string;
  shoppingItemId?: string;
}

export interface ItemPriceInsight {
  lastPrice?: number;
  lastDate?: string;
  lastMerchant?: string;
  previousPrice?: number;
  changeKes?: number;
  changePercent?: number;
  increased: boolean;
  decreased: boolean;
  isNew: boolean;
}

export interface PriceIncrease {
  itemName: string;
  category: ShoppingCategory;
  currentPrice: number;
  previousPrice: number;
  changeKes: number;
  changePercent: number;
  currentDate: string;
  previousDate: string;
  merchantName: string;
}

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  amountKes: number;
}

export interface Receipt {
  id: string;
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
  matchedShoppingItemIds?: string[];
}

export interface PersistedState {
  shoppingItems: ShoppingItem[];
  receipts: Receipt[];
  purchaseHistory: PurchaseRecord[];
}
