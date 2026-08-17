import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'shopping',
    loadComponent: () =>
      import('./pages/shopping-list/shopping-list').then((m) => m.ShoppingList),
  },
  {
    path: 'shopping-list',
    redirectTo: 'shopping',
    pathMatch: 'full',
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
