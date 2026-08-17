import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExpenseStoreService } from '../../services/expense-store.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe, DatePipe],
  templateUrl: 'dashboard.html',
})
export class Dashboard {
  protected readonly store = inject(ExpenseStoreService);
}
