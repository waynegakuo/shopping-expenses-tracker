import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeductibleCategory, VatRate } from '../../models/expense.model';
import { CsvExportService } from '../../services/csv-export.service';
import { ExpenseStoreService } from '../../services/expense-store.service';

const ANALYTICS_CATEGORIES: DeductibleCategory[] = [
  'Home Office',
  'Cloud & Tools',
  'Hardware',
  'Business Meals',
];

@Component({
  selector: 'app-tax-tracker',
  imports: [FormsModule, DecimalPipe],
  templateUrl: 'tax-tracker.html'
})
export class TaxTracker {
  protected readonly store = inject(ExpenseStoreService);
  protected readonly csvExport = inject(CsvExportService);

  readonly vatRates: VatRate[] = ['16%', '0%', 'Exempt'];
  readonly deductibleCategories: DeductibleCategory[] = [
    'Home Office',
    'Professional Tools',
    'Office Supplies',
    'Cloud & Tools',
    'Hardware',
    'Business Meals',
  ];
  readonly analyticsCategories = ANALYTICS_CATEGORIES;

  getCategoryTotal(category: DeductibleCategory): number {
    return this.store.categoryBreakdown().get(category) ?? 0;
  }

  updateReceiptField(id: string, patch: Record<string, unknown>): void {
    this.store.updateReceipt(id, patch);
  }

  toggleDeductible(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.store.updateReceipt(id, {
      isTaxDeductible: checked,
      ...(checked ? {} : { deductibleCategory: undefined }),
    });
  }
}
