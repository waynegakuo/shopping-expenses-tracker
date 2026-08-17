import { Receipt, ShoppingItem } from '../models/expense.model';

export const INITIAL_MOCK_SHOPPING_LIST: ShoppingItem[] = [
  {
    id: '1',
    name: 'MacBook USB-C Adapter & Cables',
    category: 'Tech & Hardware',
    estimatedCostKes: 4500,
    completed: true,
  },
  {
    id: '2',
    name: 'Notebooks & Whiteboard Markers',
    category: 'Office Supplies',
    estimatedCostKes: 1800,
    completed: false,
  },
  {
    id: '3',
    name: 'Weekly Groceries & Snacks',
    category: 'Groceries',
    estimatedCostKes: 6200,
    completed: true,
  },
  {
    id: '4',
    name: 'Ergonomic Desk Mat',
    category: 'Tech & Hardware',
    estimatedCostKes: 3200,
    completed: false,
  },
];

export const INITIAL_MOCK_RECEIPTS: Receipt[] = [
  {
    id: 'rec-001',
    merchantName: 'Carrefour Kenya',
    kraPin: 'P051234567Z',
    etrNumber: 'ETR-2026-08812',
    date: '2026-08-10',
    totalKes: 4500,
    paymentMethod: 'M-Pesa',
    vatRate: '16%',
    isTaxDeductible: true,
    deductibleCategory: 'Home Office',
    items: [{ description: 'USB-C Fast Charger & Hub', amountKes: 4500 }],
    matchedShoppingItemIds: ['1'],
  },
  {
    id: 'rec-002',
    merchantName: 'Naivas Supermarket',
    kraPin: 'P059876543A',
    etrNumber: 'ETR-2026-04192',
    date: '2026-08-12',
    totalKes: 6200,
    paymentMethod: 'Card',
    vatRate: '16%',
    isTaxDeductible: false,
    items: [{ description: 'Household items & Pantry Supplies', amountKes: 6200 }],
    matchedShoppingItemIds: ['3'],
  },
];
