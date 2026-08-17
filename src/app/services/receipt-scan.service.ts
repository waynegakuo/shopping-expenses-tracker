import { Injectable, signal } from '@angular/core';
import { ExtractedShoppingItem } from '../models/extracted-item.model';
import { ParsedReceiptOcr } from '../models/extracted-receipt.model';
import { parseReceiptLineItemsText, parseShoppingListText } from './receipt-text-parser';

export type ScanProgress = {
  status: 'idle' | 'scanning' | 'done' | 'error';
  progress: number;
  message: string;
};

@Injectable({ providedIn: 'root' })
export class ReceiptScanService {
  readonly scanState = signal<ScanProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  readonly previewUrl = signal<string | null>(null);

  readonly receiptScanState = signal<ScanProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  readonly receiptPreviewUrl = signal<string | null>(null);

  async extractItemsFromImage(file: File): Promise<ExtractedShoppingItem[]> {
    this.setPreview(file, 'shopping');
    this.scanState.set({ status: 'scanning', progress: 0, message: 'Reading list…' });

    try {
      const text = await this.runOcr(file, 'shopping');
      const items = parseShoppingListText(text);

      if (items.length === 0) {
        this.scanState.set({
          status: 'error',
          progress: 100,
          message: 'No items detected. Try a clearer photo of your shopping list.',
        });
        return [];
      }

      this.scanState.set({
        status: 'done',
        progress: 100,
        message: `Found ${items.length} item${items.length === 1 ? '' : 's'}`,
      });
      return items;
    } catch {
      this.scanState.set({
        status: 'error',
        progress: 0,
        message: 'Scan failed. Please retake the photo or add items manually.',
      });
      return [];
    }
  }

  async extractReceiptFromImage(file: File): Promise<ParsedReceiptOcr | null> {
    this.setPreview(file, 'receipt');
    this.receiptScanState.set({ status: 'scanning', progress: 0, message: 'Reading receipt…' });

    try {
      const text = await this.runOcr(file, 'receipt');
      const parsed = parseReceiptLineItemsText(text);

      if (parsed.lineItems.length === 0) {
        this.receiptScanState.set({
          status: 'error',
          progress: 100,
          message:
            'No line items detected. Try a clearer photo showing item names, quantities, and amounts.',
        });
        return null;
      }

      this.receiptScanState.set({
        status: 'done',
        progress: 100,
        message: `Found ${parsed.lineItems.length} line item${parsed.lineItems.length === 1 ? '' : 's'}`,
      });
      return parsed;
    } catch {
      this.receiptScanState.set({
        status: 'error',
        progress: 0,
        message: 'Scan failed. Retake the photo or enter line items manually.',
      });
      return null;
    }
  }

  clearPreview(): void {
    this.clearPreviewFor('shopping');
  }

  clearReceiptPreview(): void {
    this.clearPreviewFor('receipt');
  }

  private async runOcr(file: File, mode: 'shopping' | 'receipt'): Promise<string> {
    const stateSignal = mode === 'shopping' ? this.scanState : this.receiptScanState;

    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (info) => {
        if (info.status === 'recognizing text') {
          const progress = Math.round((info.progress ?? 0) * 100);
          stateSignal.set({
            status: 'scanning',
            progress,
            message: `Extracting text… ${progress}%`,
          });
        }
      },
    });

    const {
      data: { text },
    } = await worker.recognize(file);
    await worker.terminate();
    return text;
  }

  private clearPreviewFor(mode: 'shopping' | 'receipt'): void {
    const urlSignal = mode === 'shopping' ? this.previewUrl : this.receiptPreviewUrl;
    const stateSignal = mode === 'shopping' ? this.scanState : this.receiptScanState;

    const url = urlSignal();
    if (url) {
      URL.revokeObjectURL(url);
    }
    urlSignal.set(null);
    stateSignal.set({ status: 'idle', progress: 0, message: '' });
  }

  private setPreview(file: File, mode: 'shopping' | 'receipt'): void {
    const urlSignal = mode === 'shopping' ? this.previewUrl : this.receiptPreviewUrl;
    const previous = urlSignal();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    urlSignal.set(URL.createObjectURL(file));
  }
}
