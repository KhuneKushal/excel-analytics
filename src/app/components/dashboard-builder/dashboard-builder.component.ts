import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ChartComponent, ChartConfig } from '../chart/chart.component';
import { DashboardService } from '../../services/dashboard.service';
import { ChartType, ChartConfiguration } from 'chart.js';
import { MatDialog } from '@angular/material/dialog';
import { DrillDownModalComponent } from '../drill-down-modal/drill-down-modal.component';
import { DataProfilerService } from '../../services/data-profiler.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

type AggregationType = 'sum' | 'count' | 'average' | 'min' | 'max';

interface ColumnProfile {
  type: 'string' | 'number' | 'date' | 'boolean';
  uniqueCount: number;
  nullCount: number;
  isLikelyCategorical?: boolean;
}

@Component({
  selector: 'app-dashboard-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSnackBarModule,
    ChartComponent
  ],
  templateUrl: './dashboard-builder.component.html',
  styleUrls: ['./dashboard-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardBuilderComponent implements OnInit, OnDestroy {
  public chartConfig: Partial<ChartConfig> = {
    title: '',
    type: 'bar',
    data: { labels: [], datasets: [] }
  };
  
  public columns: string[] = [];
  public numericColumns: string[] = [];
  public categoricalColumns: string[] = [];
  public selectedXColumn: string = '';
  public selectedYColumn: string = '';
  public selectedAggregation: AggregationType = 'sum';
  
  public isPreviewLoading = false;
  public hasValidPreview = false;
  
  private destroy$ = new Subject<void>();
  private dashboardService = inject(DashboardService);
  private dialog = inject(MatDialog);
  private dataProfilerService = inject(DataProfilerService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private rawData: any[] = [];

  readonly chartTypes: { value: ChartType, label: string, icon: string }[] = [
    { value: 'bar', label: 'Bar Chart', icon: 'bar_chart' },
    { value: 'line', label: 'Line Chart', icon: 'show_chart' },
    { value: 'pie', label: 'Pie Chart', icon: 'pie_chart' },
    { value: 'doughnut', label: 'Doughnut Chart', icon: 'donut_large' },
    { value: 'scatter', label: 'Scatter Plot', icon: 'scatter_plot' },
    { value: 'radar', label: 'Radar Chart', icon: 'radar' }
  ];

  readonly aggregationTypes: { value: AggregationType, label: string, description: string }[] = [
    { value: 'sum', label: 'Sum', description: 'Total of all values' },
    { value: 'count', label: 'Count', description: 'Number of records' },
    { value: 'average', label: 'Average', description: 'Mean of all values' },
    { value: 'min', label: 'Minimum', description: 'Smallest value' },
    { value: 'max', label: 'Maximum', description: 'Largest value' }
  ];

  // Initializes the component by setting the chart title and loading data.
  ngOnInit(): void {
    this.initializeChartTitle();
    this.loadDataAndColumns();
  }

  // Cleans up subscriptions when the component is destroyed.
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Sets the initial chart title.
  private initializeChartTitle(): void {
    this.chartConfig.title = this.generateChartTitle();
  }

  // Subscribes to raw data updates to populate column selections.
  private loadDataAndColumns(): void {
    this.dashboardService.getRawData()
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe({
        next: (data) => {
          console.log('Raw data received in builder:', data);
          if (data && data.length > 0) {
            this.rawData = data;
            this.processDataColumns(data);
            this.cdr.markForCheck();
          } else {
            console.warn('No data available for chart building');
            this.columns = [];
            this.numericColumns = [];
            this.categoricalColumns = [];
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.showError('Failed to load data for chart building');
        }
      });
  }

  // Processes the loaded data to identify and categorize columns.
  private processDataColumns(data: any[]): void {
    try {
      if (!data || data.length === 0) {
        console.warn('No data to process');
        return;
      }

      // Get all column names
      this.columns = Object.keys(data[0] || {});
      console.log('Available columns:', this.columns);
      
      if (this.columns.length === 0) {
        this.showError('No columns found in the data');
        return;
      }

      // Enhanced column type detection
      this.detectColumnTypes(data);

      console.log('Numeric columns:', this.numericColumns);
      console.log('Categorical columns:', this.categoricalColumns);

      // Auto-select reasonable defaults
      if (!this.selectedXColumn && this.categoricalColumns.length > 0) {
        this.selectedXColumn = this.categoricalColumns[0];
      }
      
      if (!this.selectedYColumn && this.numericColumns.length > 0) {
        this.selectedYColumn = this.numericColumns[0];
      }

      // Auto-generate preview if we have both axes selected
      if (this.selectedXColumn && this.selectedYColumn && this.requiresYAxis) {
        setTimeout(() => this.previewChart(), 100);
      }

    } catch (error) {
      console.error('Error processing data columns:', error);
      this.showError('Error analyzing data structure');
    }
  }

  // Detects the data type of each column to categorize them.
  private detectColumnTypes(data: any[]): void {
    this.numericColumns = [];
    this.categoricalColumns = [];

    this.columns.forEach(column => {
      const sampleValues = data.slice(0, 100).map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');
      
      if (sampleValues.length === 0) {
        return; // Skip empty columns
      }

      let numericCount = 0;
      let totalCount = sampleValues.length;

      // Check if values are numeric
      sampleValues.forEach(value => {
        const numericValue = this.parseNumericValue(value);
        if (!isNaN(numericValue) && isFinite(numericValue)) {
          numericCount++;
        }
      });

      const numericRatio = numericCount / totalCount;
      const uniqueValues = new Set(sampleValues.map(v => String(v))).size;
      const uniqueRatio = uniqueValues / totalCount;

      console.log(`Column: ${column}, NumericRatio: ${numericRatio}, UniqueRatio: ${uniqueRatio}, UniqueCount: ${uniqueValues}`);

      // Determine column type
      if (numericRatio > 0.8) {
        // Mostly numeric values
        if (uniqueValues <= 10 && totalCount > 20) {
          // Low cardinality numeric - treat as categorical
          this.categoricalColumns.push(column);
        } else {
          // High cardinality numeric - treat as numeric
          this.numericColumns.push(column);
        }
      } else if (numericRatio > 0.5) {
        // Mixed values, prefer categorical
        this.categoricalColumns.push(column);
      } else {
        // Mostly non-numeric
        this.categoricalColumns.push(column);
      }
    });

    // Fallback: if no numeric columns detected, try to find any column with some numeric values
    if (this.numericColumns.length === 0) {
      this.columns.forEach(column => {
        const hasNumeric = data.some(row => {
          const value = row[column];
          return !isNaN(this.parseNumericValue(value)) && isFinite(this.parseNumericValue(value));
        });
        if (hasNumeric && !this.categoricalColumns.includes(column)) {
          this.numericColumns.push(column);
        }
      });
    }

    // Ensure we have at least some columns in each category
    if (this.categoricalColumns.length === 0 && this.columns.length > 0) {
      this.categoricalColumns = [...this.columns];
    }
  }

  // Handles changes in the chart configuration form and triggers a preview.
  public onConfigChange(): void {
    console.log('Config changed - X:', this.selectedXColumn, 'Y:', this.selectedYColumn, 'Type:', this.chartConfig.type);
    
    // Update chart title automatically
    this.chartConfig.title = this.generateChartTitle();
    
    // Auto-preview if we have required selections
    const hasRequiredSelections = this.selectedXColumn && 
      (this.selectedYColumn || ['pie', 'doughnut'].includes(this.chartConfig.type || 'bar'));
    
    if (hasRequiredSelections && this.rawData.length > 0) {
      // Small delay to ensure UI is updated
      setTimeout(() => this.previewChart(), 100);
    } else {
      this.hasValidPreview = false;
      this.cdr.markForCheck();
    }
  }

  // Generates a preview of the chart based on the current configuration.
  public previewChart(): void {
    console.log('Preview chart called');
    if (!this.validateInputs()) {
      return;
    }

    this.isPreviewLoading = true;
    this.hasValidPreview = false;
    this.cdr.markForCheck();

    try {
      // Use cached data if available
      if (this.rawData && this.rawData.length > 0) {
        this.generateChartData(this.rawData);
        this.hasValidPreview = true;
        this.isPreviewLoading = false;
        console.log('Chart preview generated successfully', this.chartConfig.data);
        this.cdr.markForCheck();
      } else {
        // Fallback to service call
        this.dashboardService.getRawData()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (data) => {
              try {
                this.rawData = data;
                this.generateChartData(data);
                this.hasValidPreview = true;
                this.isPreviewLoading = false;
                console.log('Chart preview generated successfully', this.chartConfig.data);
                this.cdr.markForCheck();
              } catch (error) {
                console.error('Error generating chart preview:', error);
                this.showError('Failed to generate chart preview');
                this.isPreviewLoading = false;
                this.hasValidPreview = false;
                this.cdr.markForCheck();
              }
            },
            error: (error) => {
              console.error('Error loading data for preview:', error);
              this.showError('Failed to load data for preview');
              this.isPreviewLoading = false;
              this.hasValidPreview = false;
              this.cdr.markForCheck();
            }
          });
      }
    } catch (error) {
      console.error('Error in previewChart:', error);
      this.showError('Failed to generate chart preview');
      this.isPreviewLoading = false;
      this.hasValidPreview = false;
      this.cdr.markForCheck();
    }
  }

  // Validates that all required inputs for chart generation are selected.
  private validateInputs(): boolean {
    if (!this.selectedXColumn) {
      this.showError('Please select an X-axis column');
      return false;
    }

    const requiresYAxis = !['pie', 'doughnut'].includes(this.chartConfig.type || 'bar');
    if (requiresYAxis && !this.selectedYColumn) {
      this.showError('Please select a Y-axis column for this chart type');
      return false;
    }

    if (!this.chartConfig.type) {
      this.showError('Please select a chart type');
      return false;
    }

    if (!this.rawData || this.rawData.length === 0) {
      this.showError('No data available for chart generation');
      return false;
    }

    return true;
  }

  // Generates the chart data based on the selected columns and chart type.
  private generateChartData(data: any[]): void {
    if (!data || data.length === 0) {
      throw new Error('No data available');
    }

    const chartType = this.chartConfig.type;
    let labels: string[] = [];
    let datasets: any[] = [];

    console.log('Generating chart data for type:', chartType);

    switch (chartType) {
      case 'scatter':
        this.generateScatterData(data, datasets);
        break;
      case 'pie':
      case 'doughnut':
        this.generatePieData(data, labels, datasets);
        break;
      case 'radar':
        this.generateRadarData(data, labels, datasets);
        break;
      default:
        this.generateStandardChartData(data, labels, datasets);
        break;
    }

    this.chartConfig.data = { labels, datasets };
    this.chartConfig.title = this.generateChartTitle();
    
    console.log('Generated chart data:', { labels, datasets });
  }

  // Generates data for a scatter plot.
  private generateScatterData(data: any[], datasets: any[]): void {
    if (!this.selectedYColumn) return;

    const scatterData = data
      .map(row => ({
        x: this.parseNumericValue(row[this.selectedXColumn]),
        y: this.parseNumericValue(row[this.selectedYColumn])
      }))
      .filter(point => !isNaN(point.x) && !isNaN(point.y) && isFinite(point.x) && isFinite(point.y));

    console.log('Scatter data points:', scatterData.length);

    datasets.push({
      label: `${this.selectedYColumn} vs ${this.selectedXColumn}`,
      data: scatterData,
      backgroundColor: 'rgba(102, 126, 234, 0.6)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    });
  }

  // Generates data for a pie or doughnut chart.
  private generatePieData(data: any[], labels: string[], datasets: any[]): void {
    const counts = this.calculateCounts(data, this.selectedXColumn);
    const sortedEntries = Object.entries(counts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10); // Limit to top 10 for readability

    console.log('Pie chart data:', sortedEntries);

    labels.push(...sortedEntries.map(([label]) => label));
    const chartData = sortedEntries.map(([, value]) => value as number);

    datasets.push({
      data: chartData,
      backgroundColor: this.generateColors(chartData.length),
      borderWidth: 2,
      borderColor: '#ffffff'
    });
  }

  // Generates data for a radar chart.
  private generateRadarData(data: any[], labels: string[], datasets: any[]): void {
    if (!this.selectedYColumn) return;

    const groupedData = this.groupAndAggregate(data, this.selectedXColumn, this.selectedYColumn);
    const sortedEntries = Object.entries(groupedData).slice(0, 8); // Limit for radar readability

    console.log('Radar chart data:', sortedEntries);

    labels.push(...sortedEntries.map(([label]) => label));
    const chartData = sortedEntries.map(([, value]) => value as number);

    datasets.push({
      label: `${this.selectedAggregation} of ${this.selectedYColumn}`,
      data: chartData,
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(102, 126, 234, 1)',
      pointBorderColor: '#ffffff',
      pointRadius: 4
    });
  }

  // Generates data for standard chart types like bar and line.
  private generateStandardChartData(data: any[], labels: string[], datasets: any[]): void {
    if (!this.selectedYColumn) return;

    const groupedData = this.groupAndAggregate(data, this.selectedXColumn, this.selectedYColumn);
    const sortedEntries = Object.entries(groupedData)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 20); // Limit to top 20 for performance

    console.log('Standard chart grouped data:', sortedEntries);

    labels.push(...sortedEntries.map(([label]) => label));
    const chartData = sortedEntries.map(([, value]) => value as number);

    const isLineChart = this.chartConfig.type === 'line';
    
    datasets.push({
      label: `${this.selectedAggregation} of ${this.selectedYColumn}`,
      data: chartData,
      backgroundColor: isLineChart ? 'transparent' : this.generateColors(chartData.length),
      borderColor: isLineChart ? 'rgba(102, 126, 234, 1)' : 'rgba(102, 126, 234, 0.8)',
      borderWidth: isLineChart ? 3 : 1,
      fill: isLineChart ? false : true,
      tension: isLineChart ? 0.4 : 0,
      pointRadius: isLineChart ? 4 : 0,
      pointHoverRadius: isLineChart ? 6 : 0
    });
  }

  // Groups data by a specified column and aggregates the values.
  private groupAndAggregate(data: any[], xColumn: string, yColumn: string): { [key: string]: number } {
    const grouped = data.reduce((acc, row) => {
      const xValue = String(row[xColumn] || '').trim();
      if (!xValue || xValue === 'undefined' || xValue === 'null') return acc;

      if (!acc[xValue]) {
        acc[xValue] = [];
      }
      
      const yValue = this.parseNumericValue(row[yColumn]);
      if (!isNaN(yValue) && isFinite(yValue)) {
        acc[xValue].push(yValue);
      }
      
      return acc;
    }, {} as { [key: string]: number[] });

    console.log('Grouped data before aggregation:', grouped);

    return Object.entries(grouped).reduce((acc, [key, valArray]) => {
      // Ensure valArray is an array and contains only numbers
      const values: number[] = Array.isArray(valArray)
        ? valArray.filter((val): val is number => typeof val === 'number' && !isNaN(val) && isFinite(val))
        : [];

      if (values.length === 0) return acc;
      
      switch (this.selectedAggregation) {
        case 'sum':
          acc[key] = values.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'count':
          acc[key] = values.length;
          break;
        case 'average':
          acc[key] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
          break;
        case 'min':
          acc[key] = Math.min(...values);
          break;
        case 'max':
          acc[key] = Math.max(...values);
          break;
        default:
          acc[key] = values.reduce((a: number, b: number) => a + b, 0);
      }
      
      return acc;
    }, {} as { [key: string]: number });
  }

  // Calculates the count of each unique value in a column.
  private calculateCounts(data: any[], column: string): { [key: string]: number } {
    return data.reduce((acc, row) => {
      const value = String(row[column] || '').trim();
      if (value && value !== 'undefined' && value !== 'null') {
        acc[value] = (acc[value] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });
  }

  // Parses a value to a number, handling various formats.
  private parseNumericValue(value: any): number {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (value === null || value === undefined || value === '') return NaN;
    
    // Handle string numbers
    const stringValue = String(value).trim();
    if (stringValue === '') return NaN;
    
    // Remove common non-numeric characters but keep decimal point and minus sign
    const cleanValue = stringValue.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanValue);
    
    return isNaN(parsed) ? NaN : parsed;
  }

  // Generates an array of colors for the chart.
  private generateColors(count: number): string[] {
    const baseColors = [
      'rgba(102, 126, 234, 0.8)', 'rgba(255, 64, 129, 0.8)', 'rgba(76, 175, 80, 0.8)',
      'rgba(255, 193, 7, 0.8)', 'rgba(156, 39, 176, 0.8)', 'rgba(255, 87, 34, 0.8)',
      'rgba(33, 150, 243, 0.8)', 'rgba(139, 195, 74, 0.8)', 'rgba(255, 152, 0, 0.8)',
      'rgba(121, 85, 72, 0.8)'
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }

  // Generates a dynamic chart title based on the selected configuration.
  private generateChartTitle(): string {
    if (!this.selectedXColumn) return 'New Chart';

    const aggregationLabel = this.aggregationTypes.find(a => a.value === this.selectedAggregation)?.label || 'Sum';
    const chartTypeLabel = this.chartTypes.find(c => c.value === this.chartConfig.type)?.label || 'Chart';

    if (this.chartConfig.type === 'pie' || this.chartConfig.type === 'doughnut') {
      return `${this.selectedXColumn} Distribution`;
    }

    if (this.chartConfig.type === 'scatter') {
      return `${this.selectedYColumn || 'Y'} vs ${this.selectedXColumn}`;
    }

    return `${aggregationLabel} of ${this.selectedYColumn || 'Value'} by ${this.selectedXColumn}`;
  }

  // Adds the configured chart to the main dashboard.
  public addToDashboard(): void {
    if (!this.validateInputs() || !this.hasValidPreview) {
      this.showError('Please generate a valid chart preview first');
      return;
    }

    if (!this.chartConfig.data || !this.chartConfig.data.datasets || this.chartConfig.data.datasets.length === 0) {
      this.showError('No chart data available to add to dashboard');
      return;
    }

    const chartToAdd: ChartConfig = {
      id: `chart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: this.chartConfig.title || this.generateChartTitle(),
      type: this.chartConfig.type as ChartType,
      data: this.chartConfig.data as ChartConfiguration['data'],
      options: this.chartConfig.options,
      xAxisColumn: this.selectedXColumn,
      yAxisColumn: this.selectedYColumn
    };

    try {
      console.log('Adding chart to dashboard:', chartToAdd);
      this.dashboardService.addChartConfig(chartToAdd);
      this.showSuccess(`Chart "${chartToAdd.title}" added to dashboard successfully!`);
      this.resetForm();
    } catch (error) {
      console.error('Error adding chart to dashboard:', error);
      this.showError('Failed to add chart to dashboard');
    }
  }

  // Opens a drill-down modal when a chart segment is clicked.
  public onChartSegmentClick(event: { label: string; value: any }): void {
    if (!this.selectedXColumn) return;

    const filteredData = this.rawData.filter(row => 
      String(row[this.selectedXColumn]).trim() === event.label
    );

    this.dialog.open(DrillDownModalComponent, {
      width: '90vw',
      maxWidth: '1000px',
      height: '80vh',
      data: { 
        filteredData, 
        clickedLabel: event.label, 
        clickedValue: event.value,
        sourceColumn: this.selectedXColumn
      }
    });
  }

  // Resets the form to its initial state.
  public resetForm(): void {
    this.chartConfig = {
      title: '',
      type: 'bar',
      data: { labels: [], datasets: [] }
    };
    this.selectedXColumn = '';
    this.selectedYColumn = '';
    this.selectedAggregation = 'sum';
    this.hasValidPreview = false;
    this.initializeChartTitle();
    this.cdr.markForCheck();
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

  // Getter to determine if the preview button should be enabled.
  get canPreview(): boolean {
    return !this.isPreviewLoading && this.validateInputsQuietly();
  }

  // Getter to determine if the "Add to Dashboard" button should be enabled.
  get canAddToDashboard(): boolean {
    return this.hasValidPreview && !this.isPreviewLoading;
  }

  // Getter to determine if a Y-axis column is required for the selected chart type.
  get requiresYAxis(): boolean {
    return !['pie', 'doughnut'].includes(this.chartConfig.type || 'bar');
  }

  // Getter to determine if the selected chart is a scatter plot.
  get isScatterChart(): boolean {
    return this.chartConfig.type === 'scatter';
  }

  // Validates inputs without showing error messages.
  private validateInputsQuietly(): boolean {
    if (!this.selectedXColumn) return false;
    const requiresYAxis = !['pie', 'doughnut'].includes(this.chartConfig.type || 'bar');
    if (requiresYAxis && !this.selectedYColumn) return false;
    if (!this.chartConfig.type) return false;
    if (!this.rawData || this.rawData.length === 0) return false;
    return true;
  }

  // TrackBy function for ngFor to improve performance.
  public trackByValue = (index: number, item: any): any => item.value;
}
