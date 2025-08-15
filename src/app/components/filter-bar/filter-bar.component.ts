import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService, Filter } from '../../services/dashboard.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatIconModule, MatButtonModule],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss']
})
export class FilterBarComponent implements OnInit {
  public filters$: Observable<Filter[]>;

  constructor(private dashboardService: DashboardService) {
    this.filters$ = this.dashboardService.getFilters();
  }

  ngOnInit(): void { }

  public removeFilter(filter: Filter): void {
    this.dashboardService.removeFilter(filter);
  }

  public clearAllFilters(): void {
    this.dashboardService.clearAllFilters();
  }
}