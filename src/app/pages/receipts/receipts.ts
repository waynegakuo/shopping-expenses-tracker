import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  DeductibleCategory,
  PaymentMethod,
  ReceiptLineItem,
  VatRate,
} from '../../models/expense.model';
import { ExpenseStoreService, NewReceiptDraft } from '../../services/expense-store.service';

@Component({
  selector: 'app-receipts',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './receipts.html'
})
export class Receipts implements OnInit {
  protected readonly store = inject(ExpenseStoreService);
  private readonly route = inject(ActivatedRoute);

  readonly modalOpen = signal(false);
  readonly uploadedFileName = signal<string | null>(null);
  readonly selectedMatches = signal<string[]>([]);
  readonly showReconcileBanner = signal(false);

  readonly paymentMethods: PaymentMethod[] = ['M-Pesa', 'Card', 'Cash'];
  readonly vatRates: VatRate[] = ['16%', '0%', 'Exempt'];

  draft: NewReceiptDraft = this.emptyDraft();

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['reconcile'] === 'true') {
        this.showReconcileBanner.set(true);
        this.openModal();
      }
    });
  }

  openModal(): void {
    this.draft = this.emptyDraft();
    this.selectedMatches.set([]);
    this.uploadedFileName.set(null);
    this.checkoutSuccess.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.showReconcileBanner.set(false);
  }

  addLineItem(): void {
    this.draft.items.push({ description: '', amountKes: 0 });
  }

  removeLineItem(index: number): void {
    this.draft.items.splice(index, 1);
  }

  toggleMatch(id: string): void {
    this.selectedMatches.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.uploadedFileName.set(file.name);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.uploadedFileName.set(file.name);
    }
  }

  readonly checkoutSuccess = signal<string | null>(null);

  submitReceipt(): void {
    if (!this.draft.merchantName.trim()) {
      return;
    }
    const items =
      this.draft.items.filter((l) => l.description.trim()).length > 0
        ? this.draft.items
        : [{ description: 'General purchase', amountKes: this.draft.totalKes }];

    const matched = this.selectedMatches();
    const fromCheckout = this.showReconcileBanner();
    const beforeCount = this.store.shoppingItems().length;

    this.store.addReceipt(
      {
        ...this.draft,
        items,
        matchedShoppingItemIds: matched,
      },
      { clearGathered: fromCheckout || matched.length > 0 },
    );

    const cleared = beforeCount - this.store.shoppingItems().length;
    if (cleared > 0) {
      this.checkoutSuccess.set(
        `Checkout complete — ${cleared} gathered item${cleared === 1 ? '' : 's'} cleared from your shopping list.`,
      );
    }
    this.closeModal();
  }

  private emptyDraft(): NewReceiptDraft {
    return {
      merchantName: '',
      kraPin: '',
      etrNumber: '',
      date: new Date().toISOString().slice(0, 10),
      totalKes: 0,
      paymentMethod: 'M-Pesa',
      vatRate: '16%',
      isTaxDeductible: false,
      items: [{ description: '', amountKes: 0 }],
      matchedShoppingItemIds: [],
    };
  }
}
