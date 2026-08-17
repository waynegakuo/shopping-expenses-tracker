export interface ExtractedReceiptLineItem {
  description: string;
  quantity: number;
  amountKes: number;
  selected: boolean;
}

export interface ParsedReceiptOcr {
  lineItems: ExtractedReceiptLineItem[];
  suggestedTotal?: number;
  suggestedMerchant?: string;
  suggestedDate?: string;
}
