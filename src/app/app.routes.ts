import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'shopping-list', pathMatch: 'full' },
  {
    path: 'shopping-list',
    loadComponent: () =>
      import('./pages/shopping-list/shopping-list').then(
        (m) => m.ShoppingList,
      ),
  },
  {
    path: 'receipts',
    loadComponent: () =>
      import('./pages/receipts/receipts').then((m) => m.Receipts),
  },
  {
    path: 'tax-tracker',
    loadComponent: () =>
      import('./pages/tax-tracker/tax-tracker').then((m) => m.TaxTracker),
  },
];
