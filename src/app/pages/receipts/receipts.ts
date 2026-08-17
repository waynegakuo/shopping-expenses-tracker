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
import { ReceiptScanService } from '../../services/receipt-scan.service';

@Component({
  selector: 'app-receipts',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './receipts.html',
})
export class Receipts implements OnInit {
  protected readonly store = inject(ExpenseStoreService);
  protected readonly scanner = inject(ReceiptScanService);
  private readonly route = inject(ActivatedRoute);

  readonly modalOpen = signal(false);
  readonly entryMode = signal<'scan' | 'manual'>('scan');
  readonly ocrReviewReady = signal(false);
  readonly selectedMatches = signal<string[]>([]);
  readonly showReconcileBanner = signal(false);
  readonly checkoutSuccess = signal<string | null>(null);

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
    this.entryMode.set('scan');
    this.ocrReviewReady.set(false);
    this.selectedMatches.set([]);
    this.checkoutSuccess.set(null);
    this.scanner.clearReceiptPreview();
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.showReconcileBanner.set(false);
    this.scanner.clearReceiptPreview();
  }

  setEntryMode(mode: 'scan' | 'manual'): void {
    this.entryMode.set(mode);
  }

  lineItemsSubtotal(): number {
    return this.draft.items
      .filter((line) => line.description.trim())
      .reduce((sum, line) => sum + line.amountKes, 0);
  }

  recalculateTotal(): void {
    const subtotal = this.lineItemsSubtotal();
    if (subtotal > 0) {
      this.draft.totalKes = subtotal;
    }
  }

  addLineItem(): void {
    this.draft.items.push({ description: '', quantity: 1, amountKes: 0 });
  }

  removeLineItem(index: number): void {
    this.draft.items.splice(index, 1);
    this.recalculateTotal();
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
    if (file?.type.startsWith('image/')) {
      void this.processReceiptScan(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.processReceiptScan(file);
    }
    input.value = '';
  }

  submitReceipt(): void {
    if (!this.draft.merchantName.trim()) {
      return;
    }

    this.recalculateTotal();

    const items =
      this.draft.items.filter((l) => l.description.trim()).length > 0
        ? this.draft.items.filter((l) => l.description.trim())
        : [{ description: 'General purchase', quantity: 1, amountKes: this.draft.totalKes }];

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

  private async processReceiptScan(file: File): Promise<void> {
    const parsed = await this.scanner.extractReceiptFromImage(file);
    if (!parsed) {
      return;
    }

    this.draft.items = parsed.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amountKes: item.amountKes,
    }));

    if (parsed.suggestedMerchant && !this.draft.merchantName) {
      this.draft.merchantName = parsed.suggestedMerchant;
    }
    if (parsed.suggestedDate) {
      this.draft.date = parsed.suggestedDate;
    }
    if (parsed.suggestedTotal) {
      this.draft.totalKes = parsed.suggestedTotal;
    } else {
      this.recalculateTotal();
    }

    this.ocrReviewReady.set(true);
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
      items: [{ description: '', quantity: 1, amountKes: 0 }],
      matchedShoppingItemIds: [],
    };
  }
}
