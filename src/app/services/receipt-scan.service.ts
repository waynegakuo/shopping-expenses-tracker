import { Injectable, signal, WritableSignal } from '@angular/core';
import { ExtractedShoppingItem } from '../models/extracted-item.model';
import { ParsedReceiptOcr } from '../models/extracted-receipt.model';
import { formatScanError, preprocessImageForOcr } from './image-preprocess';
import { parseReceiptLineItemsText, parseShoppingListText } from './receipt-text-parser';
import { loadTesseractApi, TESSERACT_WORKER_OPTIONS } from './tesseract-browser';

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
    this.scanState.set({ status: 'scanning', progress: 0, message: 'Preparing image…' });

    try {
      const text = await this.runOcr(file, this.scanState);
      const items = parseShoppingListText(text);

      if (items.length === 0) {
        this.scanState.set({
          status: 'error',
          progress: 100,
          message:
            'No items detected. Use a flat, well-lit photo with one item per line — or add manually.',
        });
        return [];
      }

      this.scanState.set({
        status: 'done',
        progress: 100,
        message: `Found ${items.length} item${items.length === 1 ? '' : 's'}`,
      });
      return items;
    } catch (error) {
      this.scanState.set({
        status: 'error',
        progress: 0,
        message: formatScanError(error),
      });
      return [];
    }
  }

  async extractReceiptFromImage(file: File): Promise<ParsedReceiptOcr | null> {
    this.setPreview(file, 'receipt');
    this.receiptScanState.set({ status: 'scanning', progress: 0, message: 'Preparing image…' });

    try {
      const text = await this.runOcr(file, this.receiptScanState);
      const parsed = parseReceiptLineItemsText(text);

      if (parsed.lineItems.length === 0) {
        this.receiptScanState.set({
          status: 'error',
          progress: 100,
          message:
            'No line items detected. Ensure item names, quantities, and KES amounts are visible — or enter manually.',
        });
        return null;
      }

      this.receiptScanState.set({
        status: 'done',
        progress: 100,
        message: `Found ${parsed.lineItems.length} line item${parsed.lineItems.length === 1 ? '' : 's'}`,
      });
      return parsed;
    } catch (error) {
      this.receiptScanState.set({
        status: 'error',
        progress: 0,
        message: formatScanError(error),
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

  private async runOcr(file: File, stateSignal: WritableSignal<ScanProgress>): Promise<string> {
    stateSignal.set({ status: 'scanning', progress: 5, message: 'Preparing image…' });
    const imageBlob = await preprocessImageForOcr(file);

    stateSignal.set({ status: 'scanning', progress: 10, message: 'Loading OCR engine…' });
    const Tesseract = await loadTesseractApi();

    if (typeof Tesseract.recognize !== 'function') {
      throw new Error('OCR engine failed to load. Please refresh and try again.');
    }

    stateSignal.set({ status: 'scanning', progress: 15, message: 'Reading text (first scan may take 20s)…' });

    const { data } = await Tesseract.recognize(imageBlob, 'eng', {
      ...TESSERACT_WORKER_OPTIONS,
      logger: (info) => {
        if (info.status === 'loading language traineddata') {
          stateSignal.set({
            status: 'scanning',
            progress: 20,
            message: 'Downloading OCR language data…',
          });
        }
        if (info.status === 'recognizing text') {
          const progress = 25 + Math.round((info.progress ?? 0) * 70);
          stateSignal.set({
            status: 'scanning',
            progress,
            message: `Extracting text… ${Math.round((info.progress ?? 0) * 100)}%`,
          });
        }
      },
    });

    if (!data.text.trim()) {
      throw new Error('No text found in image. Try a clearer, closer photo.');
    }

    return data.text;
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
