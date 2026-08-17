import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShoppingCategory } from '../../models/expense.model';
import { ExpenseStoreService } from '../../services/expense-store.service';

@Component({
  selector: 'app-shopping-list',
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: 'shopping-list.html'
})
export class ShoppingList {
  protected readonly store = inject(ExpenseStoreService);

  readonly categories: ShoppingCategory[] = [
    'Groceries',
    'Tech & Hardware',
    'Office Supplies',
    'Utilities',
  ];

  newName = '';
  newCategory: ShoppingCategory = 'Groceries';
  newCost: number | null = null;

  addItem(): void {
    if (!this.newName.trim() || this.newCost === null || this.newCost < 0) {
      return;
    }
    this.store.addShoppingItem(this.newName, this.newCategory, this.newCost);
    this.newName = '';
    this.newCost = null;
  }
}
