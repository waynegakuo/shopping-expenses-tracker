import { ShoppingCategory } from './expense.model';

export interface ExtractedShoppingItem {
  name: string;
  estimatedCostKes: number;
  category: ShoppingCategory;
  selected: boolean;
}
