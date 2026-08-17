import { Injectable, signal } from '@angular/core';
import { ExtractedShoppingItem } from '../models/extracted-item.model';
import { parseShoppingListText } from './receipt-text-parser';

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

  async extractItemsFromImage(file: File): Promise<ExtractedShoppingItem[]> {
    this.setPreview(file);
    this.scanState.set({ status: 'scanning', progress: 0, message: 'Reading receipt…' });

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            const progress = Math.round((info.progress ?? 0) * 100);
            this.scanState.set({
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

      const items = parseShoppingListText(text);

      if (items.length === 0) {
        this.scanState.set({
          status: 'error',
          progress: 100,
          message:
            'No line items detected. Try a clearer photo with item names and prices visible.',
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

  clearPreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
    this.scanState.set({ status: 'idle', progress: 0, message: '' });
  }

  private setPreview(file: File): void {
    const previous = this.previewUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
    this.previewUrl.set(URL.createObjectURL(file));
  }
}
