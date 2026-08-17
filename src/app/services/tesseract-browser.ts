const CORE_VERSION = '7.0.0';

export type TesseractLoggerMessage = {
  status: string;
  progress?: number;
};

export type TesseractWorkerOptions = {
  workerPath?: string;
  corePath?: string;
  workerBlobURL?: boolean;
  logger?: (message: TesseractLoggerMessage) => void;
};

export type TesseractApi = {
  recognize: (
    image: Blob | File,
    langs?: string,
    options?: TesseractWorkerOptions,
  ) => Promise<{ data: { text: string } }>;
};

/** Same-origin worker avoids cross-origin Worker failures on mobile browsers. */
export const TESSERACT_WORKER_OPTIONS: TesseractWorkerOptions = {
  workerPath: '/tesseract/worker.min.js',
  corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${CORE_VERSION}`,
};

declare global {
  interface Window {
    Tesseract?: TesseractApi;
  }
}

let loadPromise: Promise<TesseractApi> | null = null;

export function loadTesseractApi(): Promise<TesseractApi> {
  if (window.Tesseract?.recognize) {
    return Promise.resolve(window.Tesseract);
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-tesseract]');
      if (existing) {
        existing.addEventListener('load', () => resolveApi(resolve, reject));
        existing.addEventListener('error', () => reject(new Error('Could not download OCR engine.')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
      script.async = true;
      script.dataset['tesseract'] = 'true';
      script.onload = () => resolveApi(resolve, reject);
      script.onerror = () => reject(new Error('Could not download OCR engine. Check your connection.'));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

function resolveApi(
  resolve: (api: TesseractApi) => void,
  reject: (error: Error) => void,
): void {
  if (window.Tesseract?.recognize) {
    resolve(window.Tesseract);
    return;
  }
  reject(new Error('OCR engine loaded but API is unavailable.'));
}
