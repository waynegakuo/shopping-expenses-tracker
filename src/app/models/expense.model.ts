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

export interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  estimatedCostKes: number;
  completed: boolean;
}

export interface ReceiptLineItem {
  description: string;
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
}
