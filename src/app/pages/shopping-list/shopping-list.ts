import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShoppingCategory } from '../../models/expense.model';
import { ExtractedShoppingItem } from '../../models/extracted-item.model';
import { ExpenseStoreService } from '../../services/expense-store.service';
import { ReceiptScanService } from '../../services/receipt-scan.service';

@Component({
  selector: 'app-shopping-list',
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: 'shopping-list.html',
})
export class ShoppingList {
  protected readonly store = inject(ExpenseStoreService);
  protected readonly scanner = inject(ReceiptScanService);

  readonly categories: ShoppingCategory[] = [
    'Groceries',
    'Tech & Hardware',
    'Office Supplies',
    'Utilities',
  ];

  readonly reviewOpen = signal(false);
  readonly extractedItems = signal<ExtractedShoppingItem[]>([]);
  readonly addMode = signal<'scan' | 'manual'>('scan');

  newName = '';
  newCategory: ShoppingCategory = 'Groceries';
  newCost: number | null = null;

  setAddMode(mode: 'scan' | 'manual'): void {
    this.addMode.set(mode);
  }

  addItem(): void {
    if (!this.newName.trim() || this.newCost === null || this.newCost < 0) {
      return;
    }
    this.store.addShoppingItem(this.newName, this.newCategory, this.newCost);
    this.newName = '';
    this.newCost = null;
  }

  onScanDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onScanDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) {
      void this.processScanFile(file);
    }
  }

  onScanFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.processScanFile(file);
    }
    input.value = '';
  }

  toggleExtractedItem(index: number): void {
    this.extractedItems.update((items) =>
      items.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)),
    );
  }

  removeExtractedItem(index: number): void {
    this.extractedItems.update((items) => items.filter((_, i) => i !== index));
  }

  selectedExtractedCount(): number {
    return this.extractedItems().filter((item) => item.selected).length;
  }

  confirmExtractedItems(): void {
    const selected = this.extractedItems().filter(
      (item) => item.selected && item.name.trim() && item.estimatedCostKes > 0,
    );
    if (selected.length === 0) {
      return;
    }
    this.store.addShoppingItems(selected);
    this.closeReview();
  }

  closeReview(): void {
    this.reviewOpen.set(false);
    this.extractedItems.set([]);
    this.scanner.clearPreview();
  }

  private async processScanFile(file: File): Promise<void> {
    const items = await this.scanner.extractItemsFromImage(file);
    if (items.length > 0) {
      this.extractedItems.set(items);
      this.reviewOpen.set(true);
    }
  }
}
