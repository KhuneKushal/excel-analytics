import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, ChangeDetectorRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ChartComponent, ChartConfig } from '../chart/chart.component';
import { DashboardService } from '../../services/dashboard.service';
import { ExportService } from '../../services/export.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DashboardActionsService } from '../../services/dashboard-actions.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartConfiguration, ChartType } from 'chart.js';
import { MatTooltipModule } from '@angular/material/tooltip';

// Defines the structure for a chart item within the dashboard grid.
export interface DashboardChartItem {
  id: string;
  title: string;
  type: ChartType;
  data: ChartConfiguration['data'];
  options?: ChartConfiguration['options'];
  xAxisColumn?: string;
  yAxisColumn?: string;
}

@Component({
  selector: 'app-my-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    ChartComponent,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './my-dashboard.component.html',
  styleUrls: ['./my-dashboard.component.scss']
})
export class MyDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dashboardGrid') dashboardGrid!: ElementRef;
  
  public charts: DashboardChartItem[] = [];
  public chartIds: string[] = [];
  private destroy$ = new Subject<void>();
  public isBrowser: boolean;

  // Use inject() function in field initializers (supported injection context)
  private dashboardService = inject(DashboardService);
  private exportService = inject(ExportService);
  private dashboardActionsService = inject(DashboardActionsService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    console.log('Constructor - charts.length:', this.charts.length);
  }

  ngOnInit(): void {
    console.log('Dashboard component initialized, isBrowser:', this.isBrowser);
    console.log('ngOnInit - charts.length:', this.charts.length);
    // Start loading charts immediately if in browser
    if (this.isBrowser) {
      this.setupChartSubscription();
      this.setupDashboardActions();
    }
  }

  ngAfterViewInit(): void {
    // Ensure subscriptions are set up after view init for non-browser environments
    if (!this.isBrowser) {
      this.setupChartSubscription();
      this.setupDashboardActions();
    }
  }

  

  private setupChartSubscription(): void {
    console.log('Setting up chart subscription');
    console.log('setupChartSubscription - start - charts.length:', this.charts.length);
    this.dashboardService.getChartConfigs()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
      )
      .subscribe({
        next: (chartConfigs) => {
          try {
            console.log('Received chart configs:', chartConfigs);
            console.log('setupChartSubscription - before charts assignment - charts.length:', this.charts.length);
            
            if (!chartConfigs || chartConfigs.length === 0) {
              console.log('No chart configs received');
              this.charts = [];
              this.cdr.detectChanges();
              console.log('setupChartSubscription - after empty charts assignment - charts.length:', this.charts.length);
              return;
            }

            // Filter out any null or undefined chart configurations
            const validChartConfigs = chartConfigs.filter(config => config != null);

            this.charts = validChartConfigs.map((config, index) => {
              // Validate chart config
              if (!config.id) {
                config.id = `chart-${Date.now()}-${index}`;
              }

              // Ensure data exists and has proper structure
              if (!config.data || !config.data.datasets || config.data.datasets.length === 0) {
                console.warn('Chart config missing data:', config);
                // Provide default empty data
                config.data = {
                  labels: ['No Data'],
                  datasets: [{
                    data: [0],
                    label: 'No Data Available',
                    backgroundColor: ['#e0e0e0']
                  }]
                };
              }

              const chartItem: DashboardChartItem = {
                id: config.id,
                title: config.title || `Chart ${index + 1}`,
                type: config.type || 'bar',
                data: config.data,
                options: config.options || this.getDefaultChartOptions(config.type || 'bar'),
                xAxisColumn: config.xAxisColumn,
                yAxisColumn: config.yAxisColumn
              };

              return chartItem;
            });

            console.log('Processed charts for dashboard:', this.charts.length);
            this.chartIds = this.charts.map(c => c.id);
            this.cdr.detectChanges();
            console.log('setupChartSubscription - after charts and chartIds assignment - charts.length:', this.charts.length);

            // Trigger resize event for charts after DOM update
            if (this.isBrowser) {
              setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
              }, 300);
            }
          } catch (error) {
            console.error('Error processing chart data:', error);
            this.showError('Error processing chart data');
            this.charts = [];
            this.cdr.detectChanges();
            console.log('setupChartSubscription - catch block - charts.length:', this.charts.length);
          }
        },
        error: (error) => {
          console.error('Error in chart subscription:', error);
          this.showError('Failed to load dashboard charts');
          this.charts = [];
          this.cdr.detectChanges();
          console.log('setupChartSubscription - error block - charts.length:', this.charts.length);
        }
      });
  }

  private getDefaultChartOptions(type: ChartType): ChartConfiguration['options'] {
    const baseOptions: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      }
    };

    switch (type) {
      case 'bar':
      case 'line':
        return {
          ...baseOptions,
          scales: {
            x: { beginAtZero: true },
            y: { beginAtZero: true }
          }
        };
      case 'pie':
      case 'doughnut':
        return {
          ...baseOptions,
          plugins: {
            ...baseOptions.plugins,
            legend: {
              ...baseOptions.plugins?.legend,
              position: 'right'
            }
          }
        };
      default:
        return baseOptions;
    }
  }

  private setupDashboardActions(): void {
    this.dashboardActionsService.downloadPdf$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.dashboardGrid?.nativeElement) {
          const chartsToExport: ChartConfig[] = this.charts.map(chartItem => ({
            id: chartItem.id,
            title: chartItem.title,
            type: chartItem.type,
            data: chartItem.data,
            options: chartItem.options,
            xAxisColumn: chartItem.xAxisColumn,
            yAxisColumn: chartItem.yAxisColumn
          }));
          this.exportService.downloadDashboardAsPdf(chartsToExport);
        } else {
          console.error('Dashboard grid element not found.');
        }
      });

    this.dashboardActionsService.importConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.exportService.uploadJson().then((config: any) => {
          this.dashboardActionsService.sendImportedConfig(config);
        }).catch((error: any) => {
          console.error('Error importing dashboard config:', error);
        });
      });

    this.dashboardActionsService.importedConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        if (config && Array.isArray(config)) {
          this.dashboardService.setChartConfigs(config);
        } else {
          console.warn('Invalid config format received:', config);
        }
      });
  }

  public deleteChart(chartId: string): void {
    if (chartId) {
      console.log('Deleting chart:', chartId);
      this.dashboardService.removeChartConfig(chartId);
      this.showSuccess('Chart deleted successfully');
    }
  }

  public exportChartToPng(chartId: string, title: string): void {
    if (chartId && title) {
      this.exportService.exportChartAsImage(chartId, title);
    }
  }

  public exportChartToPdf(chartId: string, title: string): void {
    if (chartId && title) {
      this.exportService.exportChartAsPdf(chartId, title);
    }
  }

  public onSegmentClick(event: { label: string; value: any }, chart: DashboardChartItem): void {
    if (!chart.xAxisColumn) {
      console.warn('Chart does not have an xAxisColumn defined for filtering.');
      return;
    }
    
    if (!event.label) {
      console.warn('No label provided in segment click event.');
      return;
    }

    const filter = {
      column: chart.xAxisColumn,
      operator: '==' as const,
      value: event.label
    };
    
    this.dashboardService.addFilter(filter);
    this.showSuccess(`Filter applied: ${chart.xAxisColumn} = ${event.label}`);
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showWarning(message: string): void {
    this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['warning-snackbar']
    });
  }

  public trackByChartId = (index: number, chart: DashboardChartItem): string => {
    return chart.id || `chart-${index}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}