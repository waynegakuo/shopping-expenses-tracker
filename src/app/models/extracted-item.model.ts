import { ShoppingCategory } from './expense.model';

export interface ExtractedShoppingItem {
  name: string;
  category: ShoppingCategory;
  selected: boolean;
}
