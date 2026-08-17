import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: 'nav.html',
})
export class Nav {
  readonly links = [
    { path: '/', label: 'Home', exact: true },
    { path: '/shopping', label: 'Shopping' },
    { path: '/receipts', label: 'Receipts' },
    { path: '/tax-tracker', label: 'Tax Tracker' },
  ];
}
