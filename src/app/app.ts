import { RouterModule } from '@angular/router';
import { Component, inject, OnInit } from '@angular/core';
import { NavComponent } from './components/nav/nav.component';
import { DashboardService } from './services/dashboard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavComponent, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private dashboardService = inject(DashboardService);

  ngOnInit(): void {
    this.dashboardService.initialize();
  }
}