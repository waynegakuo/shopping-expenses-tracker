import { Injectable } from '@angular/core';
import { Receipt } from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class CsvExportService {
  exportTaxReceipts(receipts: Receipt[]): void {
    const headers = [
      'Date',
      'Merchant Name',
      'KRA PIN',
      'ETR / Control Number',
      'Payment Method',
      'Total (KES)',
      'VAT Rate',
      'Tax Deductible',
      'Deductible Category',
      'Line Items',
      'VAT Claim (KES)',
    ];

    const rows = receipts.map((receipt) => {
      const vatClaim =
        receipt.isTaxDeductible && receipt.vatRate === '16%'
          ? (receipt.totalKes - receipt.totalKes / 1.16).toFixed(2)
          : '0.00';

      const lineItems = receipt.items
        .map((item) => `${item.description} (${item.amountKes})`)
        .join('; ');

      return [
        receipt.date,
        receipt.merchantName,
        receipt.kraPin,
        receipt.etrNumber,
        receipt.paymentMethod,
        receipt.totalKes.toString(),
        receipt.vatRate,
        receipt.isTaxDeductible ? 'Yes' : 'No',
        receipt.deductibleCategory ?? '',
        lineItems,
        vatClaim,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kra-expense-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
