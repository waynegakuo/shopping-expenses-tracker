import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: 'nav.html'
})
export class Nav {
  readonly links = [
    { path: '/shopping-list', label: 'Shopping List' },
    { path: '/receipts', label: 'Receipts' },
    { path: '/tax-tracker', label: 'Tax Tracker' },
  ];
}
