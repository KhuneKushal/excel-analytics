import { Component, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ResetDialogComponent } from '../reset-dialog/reset-dialog.component';
import { DashboardService } from '../../services/dashboard.service';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { DashboardActionsService } from '../../services/dashboard-actions.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    RouterModule,
    RouterOutlet,
    FilterBarComponent
  ],
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {
  constructor(private dialog: MatDialog, private dashboardService: DashboardService, private dashboardActionsService: DashboardActionsService) { }

  openResetDialog(): void {
    const dialogRef = this.dialog.open(ResetDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dashboardService.resetDashboard();
      }
    });
  }

  triggerDownloadPdf(): void {
    this.dashboardActionsService.triggerDownloadPdf();
  }

  triggerImportConfig(): void {
    this.dashboardActionsService.triggerImportConfig();
  }
}
