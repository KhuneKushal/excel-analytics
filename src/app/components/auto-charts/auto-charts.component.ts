import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartComponent, ChartConfig } from '../chart/chart.component';
import { DashboardService } from '../../services/dashboard.service';
import { DataProfilerService } from '../../services/data-profiler.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ChartType } from 'chart.js';

@Component({
  selector: 'app-auto-charts',
  standalone: true,
  imports: [
    CommonModule, 
    ChartComponent, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './auto-charts.component.html',
  styleUrls: ['./auto-charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AutoChartsComponent implements OnInit, OnDestroy {
  public charts: ChartConfig[] = [];
  public isGenerating = false;
  public hasData = false;

  private dashboardService = inject(DashboardService);
  private dataProfilerService = inject(DataProfilerService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  private readonly MAX_CHARTS = 12;
  private readonly MAX_CATEGORIES = 15;
  private readonly COLOR_PALETTES = {
    primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
    secondary: ['#4facfe', '#00f2fe', '#43e97b', '#38f9d7'],
    accent: ['#fa709a', '#fee140', '#a8edea', '#fed6e3'],
    neutral: ['#667eea', '#764ba2', '#f093fb', '#f5576c']
  };

  // Initializes the component by loading data and generating charts.
  ngOnInit(): void {
    this.loadDataAndGenerateCharts();
  }

  // Cleans up subscriptions when the component is destroyed.
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Subscribes to raw data updates to trigger chart generation.
  private loadDataAndGenerateCharts(): void {
    this.dashboardService.getRawData()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe({
        next: (data) => {
          this.hasData = data && data.length > 0;
          if (this.hasData) {
            this.generateCharts(data);
          } else {
            this.charts = [];
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading data for auto charts:', error);
          this.showError('Failed to load data for automatic chart generation');
          this.isGenerating = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Generates a variety of charts based on the provided data.
  private generateCharts(data: any[]): void {
    this.isGenerating = true;
    this.cdr.markForCheck();

    try {
      const profiledData = this.dataProfilerService.profileData(data);
      this.charts = [];

      // Generate different types of charts
      this.charts.push(...this.createOverviewCharts(data));
      this.charts.push(...this.createNumericCharts(data, profiledData));
      this.charts.push(...this.createCategoricalCharts(data, profiledData));
      this.charts.push(...this.createTimeSeriesCharts(data, profiledData));
      this.charts.push(...this.createCorrelationCharts(data, profiledData));

      // Limit total number of charts
      this.charts = this.charts.slice(0, this.MAX_CHARTS);

      this.isGenerating = false;
      this.cdr.markForCheck();

      if (this.charts.length > 0) {
        this.showSuccess(`Generated ${this.charts.length} automatic charts`);
      }

    } catch (error) {
      console.error('Error generating automatic charts:', error);
      this.showError('Failed to generate automatic charts');
      this.isGenerating = false;
      this.cdr.markForCheck();
    }
  }

  // Creates overview charts, such as total records.
  private createOverviewCharts(data: any[]): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Total records chart
    charts.push({
      id: `overview-total-${Date.now()}`,
      title: 'Total Records',
      type: 'doughnut',
      data: {
        labels: ['Total Records'],
        datasets: [{
          data: [data.length],
          backgroundColor: [this.COLOR_PALETTES.primary[0]],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: () => `${data.length} records`
            }
          }
        }
      }
    });

    return charts;
  }

  // Creates charts for numeric columns, including statistics and distributions.
  private createNumericCharts(data: any[], profiledData: any): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const numericColumns = Object.keys(profiledData).filter(key =>
      profiledData[key].type === 'number' && !profiledData[key].isLikelyCategorical
    );

    numericColumns.slice(0, 4).forEach((column, index) => {
      const values = data.map(row => Number(row[column])).filter(val => !isNaN(val) && isFinite(val));
      
      if (values.length === 0) return;

      const stats = this.calculateStatistics(values);
      const colorIndex = index % this.COLOR_PALETTES.primary.length;

      // Summary statistics chart
      charts.push({
        id: `numeric-stats-${column}-${Date.now()}`,
        title: `${column} Statistics`,
        type: 'bar',
        data: {
          labels: ['Min', 'Avg', 'Max'],
          datasets: [{
            data: [stats.min, stats.mean, stats.max],
            label: column,
            backgroundColor: [
              this.COLOR_PALETTES.primary[0],
              this.COLOR_PALETTES.primary[1],
              this.COLOR_PALETTES.primary[2]
            ],
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.8)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // Distribution histogram (simplified)
      if (values.length > 10) {
        const histogram = this.createHistogram(values, 8);
        charts.push({
          id: `numeric-dist-${column}-${Date.now()}`,
          title: `${column} Distribution`,
          type: 'line',
          data: {
            labels: histogram.bins,
            datasets: [{
              data: histogram.counts,
              label: 'Frequency',
              borderColor: this.COLOR_PALETTES.secondary[colorIndex],
              backgroundColor: `${this.COLOR_PALETTES.secondary[colorIndex]}20`,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: { title: { display: true, text: column } },
              y: { title: { display: true, text: 'Count' }, beginAtZero: true }
            }
          }
        });
      }
    });

    return charts;
  }

  // Creates charts for categorical columns, such as bar and pie charts.
  private createCategoricalCharts(data: any[], profiledData: any): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const categoricalColumns = Object.keys(profiledData).filter(key =>
      (profiledData[key].type === 'string' && profiledData[key].uniqueCount > 1 && profiledData[key].uniqueCount <= 50) ||
      (profiledData[key].type === 'number' && profiledData[key].isLikelyCategorical)
    );

    categoricalColumns.slice(0, 4).forEach((column, index) => {
      const counts = this.calculateCounts(data, column);
      const sortedEntries = Object.entries(counts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, this.MAX_CATEGORIES);

      if (sortedEntries.length === 0) return;

      const labels = sortedEntries.map(([label]) => label);
      const values = sortedEntries.map(([, value]) => value as number);
      const colorPalette = this.COLOR_PALETTES.accent;

      // Bar chart for categories
      charts.push({
        id: `categorical-bar-${column}-${Date.now()}`,
        title: `${column} Distribution`,
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            label: 'Count',
            backgroundColor: this.generateGradientColors(values.length, colorPalette),
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.8)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { 
              ticks: { 
                maxRotation: 45,
                font: { size: 10 }
              }
            },
            y: { beginAtZero: true }
          }
        }
      });

      // Pie chart for top categories (if not too many)
      if (labels.length <= 8 && labels.length > 1) {
        charts.push({
          id: `categorical-pie-${column}-${Date.now()}`,
          title: `Top ${column} Categories`,
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: this.generateGradientColors(values.length, colorPalette),
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { 
                position: 'right',
                labels: { 
                  font: { size: 10 },
                  usePointStyle: true
                }
              }
            }
          }
        });
      }
    });

    return charts;
  }

  // Creates line charts for time series data.
  private createTimeSeriesCharts(data: any[], profiledData: any): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const dateColumns = Object.keys(profiledData).filter(key =>
      profiledData[key].type === 'date' && profiledData[key].isLikelyTimeSeries
    );

    dateColumns.slice(0, 2).forEach(column => {
      const validDates = data
        .map(row => {
          const date = new Date(row[column]);
          return isNaN(date.getTime()) ? null : date;
        })
        .filter(date => date !== null)
        .sort((a, b) => a!.getTime() - b!.getTime()) as Date[];

      if (validDates.length < 5) return;

      // Group by month
      const monthlyData = this.groupByMonth(validDates);
      const sortedMonths = Object.keys(monthlyData).sort();
      const counts = sortedMonths.map(month => monthlyData[month]);

      charts.push({
        id: `timeseries-${column}-${Date.now()}`,
        title: `${column} Timeline (Monthly)`,
        type: 'line',
        data: {
          labels: sortedMonths.map(month => new Date(month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })),
          datasets: [{
            data: counts,
            label: 'Records',
            borderColor: this.COLOR_PALETTES.secondary[0],
            backgroundColor: `${this.COLOR_PALETTES.secondary[0]}20`,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { 
              ticks: { 
                maxRotation: 45,
                font: { size: 10 }
              }
            },
            y: { beginAtZero: true }
          }
        }
      });
    });

    return charts;
  }

  // Creates scatter plots to show correlations between numeric columns.
  private createCorrelationCharts(data: any[], profiledData: any): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const numericColumns = Object.keys(profiledData).filter(key =>
      profiledData[key].type === 'number' && !profiledData[key].isLikelyCategorical
    );

    // Create scatter plots for numeric correlations
    if (numericColumns.length >= 2) {
      for (let i = 0; i < Math.min(numericColumns.length - 1, 2); i++) {
        const xCol = numericColumns[i];
        const yCol = numericColumns[i + 1];

        const scatterData = data
          .map(row => ({
            x: Number(row[xCol]),
            y: Number(row[yCol])
          }))
          .filter(point => !isNaN(point.x) && !isNaN(point.y) && isFinite(point.x) && isFinite(point.y))
          .slice(0, 200); // Limit points for performance

        if (scatterData.length < 5) continue;

        charts.push({
          id: `correlation-${xCol}-${yCol}-${Date.now()}`,
          title: `${yCol} vs ${xCol}`,
          type: 'scatter',
          data: {
            datasets: [{
              label: `${yCol} vs ${xCol}`,
              data: scatterData,
              backgroundColor: `${this.COLOR_PALETTES.neutral[i]}60`,
              borderColor: this.COLOR_PALETTES.neutral[i],
              pointRadius: 3,
              pointHoverRadius: 5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: { 
                type: 'linear',
                title: { display: true, text: xCol }
              },
              y: { 
                type: 'linear',
                title: { display: true, text: yCol }
              }
            }
          }
        });
      }
    }

    return charts;
  }

  // Calculates basic statistics for an array of numbers.
  private calculateStatistics(values: number[]): { min: number, max: number, mean: number, median: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }

  // Counts the occurrences of each value in a column.
  private calculateCounts(data: any[], column: string): { [key: string]: number } {
    return data.reduce((acc, row) => {
      const value = String(row[column] || '').trim();
      if (value) {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
  }

  // Creates a histogram from an array of numbers.
  private createHistogram(values: number[], binCount: number): { bins: string[], counts: number[] } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / binCount;
    
    const bins: string[] = [];
    const counts: number[] = [];
    
    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const binLabel = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
      bins.push(binLabel);
      
      const count = values.filter(v => v >= binStart && (i === binCount - 1 ? v <= binEnd : v < binEnd)).length;
      counts.push(count);
    }
    
    return { bins, counts };
  }

  // Groups an array of dates by month.
  private groupByMonth(dates: Date[]): { [key: string]: number } {
    return dates.reduce((acc, date) => {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  // Generates a gradient of colors from a given palette.
  private generateGradientColors(count: number, palette: string[]): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const colorIndex = i % palette.length;
      const opacity = 0.8 - (Math.floor(i / palette.length) * 0.1);
      colors.push(`${palette[colorIndex]}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
    }
    return colors;
  }

  // Adds a selected chart to the main dashboard.
  public addToDashboard(chart: ChartConfig): void {
    try {
      const chartToAdd: ChartConfig = {
        ...chart,
        id: `auto-chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      this.dashboardService.addChartConfig(chartToAdd);
      this.showSuccess(`Chart "${chart.title}" added to dashboard!`);
    } catch (error) {
      console.error('Error adding chart to dashboard:', error);
      this.showError('Failed to add chart to dashboard');
    }
  }

  // Regenerates the automatic charts with the current data.
  public regenerateCharts(): void {
    this.dashboardService.getRawData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.generateCharts(data);
          }
        },
        error: (error) => {
          console.error('Error regenerating charts:', error);
          this.showError('Failed to regenerate charts');
        }
      });
  }

  // Displays an error message using a snackbar.
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // Displays a success message using a snackbar.
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // TrackBy function for ngFor to improve performance when rendering charts.
  public trackByChartId = (index: number, chart: ChartConfig): string => {
    return chart.id;
  }

  // Returns an icon string based on the chart type.
  public getChartIcon(type: ChartType): string {
    const iconMap: { [key in ChartType]?: string } = {
      bar: 'bar_chart',
      line: 'show_chart',
      pie: 'pie_chart',
      doughnut: 'donut_large',
      scatter: 'scatter_plot',
      radar: 'radar'
    };
    return iconMap[type] || 'insert_chart';
  }

  // Returns a user-friendly label for a given chart type.
  public getChartTypeLabel(type: ChartType): string {
    const labelMap: { [key in ChartType]?: string } = {
      bar: 'Bar Chart',
      line: 'Line Chart',
      pie: 'Pie Chart',
      doughnut: 'Doughnut Chart',
      scatter: 'Scatter Plot',
      radar: 'Radar Chart'
    };
    return labelMap[type] || 'Chart';
  }
}
