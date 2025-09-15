import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChartConfig } from '../components/chart/chart.component';
import { isPlatformBrowser } from '@angular/common';

// Define local interfaces to avoid importing chart.js on the server
interface ChartDataset {
  data: number[];
  label?: string;
  backgroundColor?: any;
  borderColor?: any;
  borderWidth?: any;
  type?: string;
  fill?: boolean;
}

type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export interface Filter {
  column: string;
  operator: string;
  value: any;
  value2?: any; // For 'between' operator
}

export interface UploadedFileMetadata {
  fileName: string;
  fileExtension: string;
  uploadTimestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private rawData = new BehaviorSubject<any[]>([]);
  private filteredData = new BehaviorSubject<any[]>([]);
  private chartConfigs = new BehaviorSubject<ChartConfig[]>([]);
  private filters = new BehaviorSubject<Filter[]>([]);
  private uploadedFilesMetadata = new BehaviorSubject<UploadedFileMetadata[]>([]);
  private summaryData = new BehaviorSubject<any>(null);

  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  }

  public initialize(): void {
    console.log("Initializing dashboard service");
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      try {
        // Do not load rawData from localStorage to prevent QuotaExceededError
        // const rawData = localStorage.getItem('rawData');
        // this.rawData.next(rawData ? JSON.parse(rawData) : []);
        this.rawData.next([]); // Initialize rawData as empty on load

        const chartConfigs = localStorage.getItem('chartConfigs');
        this.chartConfigs.next(chartConfigs ? JSON.parse(chartConfigs) : []);

        const filters = localStorage.getItem('filters');
        this.filters.next(filters ? JSON.parse(filters) : []);

        const uploadedFilesMetadata = localStorage.getItem('uploadedFilesMetadata');
        this.uploadedFilesMetadata.next(uploadedFilesMetadata ? JSON.parse(uploadedFilesMetadata).map((item: any) => ({ ...item, uploadTimestamp: new Date(item.uploadTimestamp) })) : []);

      } catch (error) {
        console.warn('Error loading from localStorage:', error);
        // Initialize with empty data if localStorage fails
        this.rawData.next([]);
        this.chartConfigs.next([]);
        this.filters.next([]);
        this.uploadedFilesMetadata.next([]);
      }
    }
    this.applyFilters(); // Apply filters even if loaded from empty state
  }

  private saveToLocalStorage(): void {
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      try {
        // Do not save rawData to localStorage to prevent QuotaExceededError
        // localStorage.setItem('rawData', JSON.stringify(this.rawData.value));
        localStorage.setItem('chartConfigs', JSON.stringify(this.chartConfigs.value));
        localStorage.setItem('filters', JSON.stringify(this.filters.value));
        localStorage.setItem('uploadedFilesMetadata', JSON.stringify(this.uploadedFilesMetadata.value));
      } catch (error) {
        console.warn('Error saving to localStorage:', error);
      }
    }
  }

  public setData(rows: any[], fileMetadata?: UploadedFileMetadata): void {
    console.log('DashboardService: setData called with', rows.length, 'rows'); // ADDED LOG
    this.rawData.next(rows);
    if (fileMetadata) {
      const currentMetadata = this.uploadedFilesMetadata.value;
      this.uploadedFilesMetadata.next([...currentMetadata, fileMetadata]);
    }
    this.applyFilters();
    this.saveToLocalStorage();
  }

  public getRawData(): Observable<any[]> {
    return this.rawData.asObservable();
  }

  public get currentData(): Observable<any[]> {
    return this.rawData.asObservable();
  }

  public getCurrentData(): any[] {
    return this.rawData.getValue();
  }

  public getFilteredData(): Observable<any[]> {
    return this.filteredData.asObservable();
  }

  public getUploadedFilesMetadata(): Observable<UploadedFileMetadata[]> {
    return this.uploadedFilesMetadata.asObservable();
  }

  public addChartConfig(config: ChartConfig): void {
    const currentConfigs = this.chartConfigs.getValue();
    const updatedConfigs = [...currentConfigs, config];
    this.chartConfigs.next(updatedConfigs);
    this.saveToLocalStorage();
  }

  public removeChartConfig(chartId: string): void {
    const configs = this.chartConfigs.value.filter(c => c.id !== chartId);
    this.chartConfigs.next(configs);
    this.saveToLocalStorage();
  }

  public getChartConfigs(): Observable<ChartConfig[]> {
    return this.chartConfigs.asObservable();
  }

  public setChartConfigs(configs: ChartConfig[]): void {
    this.chartConfigs.next(configs);
    this.saveToLocalStorage();
  }

  public getFilters(): Observable<Filter[]> {
    return this.filters.asObservable();
  }

  public addFilter(newFilter: Filter): void {
    const currentFilters = this.filters.value;
    const existingFilterIndex = currentFilters.findIndex(f => f.column === newFilter.column);

    let updatedFilters: Filter[];
    if (existingFilterIndex > -1) {
      // Update existing filter for the same column
      updatedFilters = currentFilters.map((filter, index) =>
        index === existingFilterIndex ? newFilter : filter
      );
    } else {
      // Add new filter
      updatedFilters = [...currentFilters, newFilter];
    }
    this.filters.next(updatedFilters);
    this.applyFilters();
    this.saveToLocalStorage();
  }

  public setFilters(filters: Filter[]): void {
    this.filters.next(filters);
    this.applyFilters();
    this.saveToLocalStorage();
  }

  public removeFilter(filter: Filter): void {
    // This method might need adjustment if filters become more complex with operators
    // For now, a simple match on column and value (if operator is '==')
    const filters = this.filters.value.filter(f => !(f.column === filter.column && f.value === filter.value && f.operator === filter.operator));
    this.filters.next(filters);
    this.applyFilters();
    this.saveToLocalStorage();
  }

  public clearAllFilters(): void {
    this.filters.next([]);
    this.applyFilters();
    this.saveToLocalStorage();
  }

  private applyFilters(): void {
    const filters = this.filters.value;
    if (filters.length === 0) {
      this.filteredData.next(this.rawData.value);
      return;
    }

    const filteredData = this.rawData.value.filter(row => {
      return filters.every(filter => {
        const columnValue = row[filter.column];

        switch (filter.operator) {
          case '==':
            return columnValue === filter.value;
          case '!=':
            return columnValue !== filter.value;
          case '>':
            return columnValue > filter.value;
          case '<':
            return columnValue < filter.value;
          case '>=':
            return columnValue >= filter.value;
          case '<=':
            return columnValue <= filter.value;
          case 'contains':
            return String(columnValue).includes(String(filter.value));
          case 'startsWith':
            return String(columnValue).startsWith(String(filter.value));
          case 'endsWith':
            return String(columnValue).endsWith(String(filter.value));
          case 'between':
            return columnValue >= filter.value && columnValue <= filter.value2;
          case '==true':
            return columnValue === true;
          case '==false':
            return columnValue === false;
          default:
            return true; // Unknown operator, don't filter
        }
      });
    });
    this.filteredData.next(filteredData);
  }

  public processChartData(chartConfig: ChartConfig, data: any[]): ChartConfig {
    console.log('processChartData: Input chartConfig:', chartConfig);
    console.log('processChartData: Input data (filteredData):', data);

    const newChartConfig = { ...chartConfig };
    const labels: string[] = [];
    const datasetData: number[] = [];

    if (!chartConfig.xAxisColumn || !chartConfig.yAxisColumn) {
      console.warn('processChartData: xAxisColumn or yAxisColumn missing. Returning empty data.');
      newChartConfig.data = { labels: [], datasets: [] };
      return newChartConfig;
    }

    const groupedData = data.reduce((acc, row, index) => {
      const xValue = row[chartConfig.xAxisColumn!];
      const yValue = Number(row[chartConfig.yAxisColumn!]);

      if (xValue !== undefined && yValue !== undefined && !isNaN(yValue)) {
        if (!acc[xValue]) {
          acc[xValue] = 0;
        }
        acc[xValue] += yValue;
      } else {
        console.warn(`processChartData: Skipping row ${index} due to invalid xValue (${xValue}) or yValue (${row[chartConfig.yAxisColumn!]}) which results in NaN (${yValue}).`);
      }
      return acc;
    }, {} as { [key: string]: number });

    console.log('processChartData: Grouped Data:', groupedData);

    for (const key in groupedData) {
      labels.push(key);
      datasetData.push(groupedData[key]);
    }

    console.log('processChartData: Final Labels:', labels);
    console.log('processChartData: Final DatasetData:', datasetData);

    let datasets: ChartDataset[] = [];

    switch (chartConfig.type) {
      case 'bar':
        const barDataset: ChartDataset = {
          type: 'bar',
          label: chartConfig.yAxisColumn,
          data: datasetData,
          backgroundColor: chartConfig.data.datasets[0]?.backgroundColor || 'rgba(75, 192, 192, 0.6)',
          borderColor: chartConfig.data.datasets[0]?.borderColor || 'rgba(75, 192, 192, 1)',
          borderWidth: chartConfig.data.datasets[0]?.borderWidth || 1,
        };
        datasets.push(barDataset);
        break;
      case 'line':
        const lineDataset: ChartDataset = {
          type: 'line',
          label: chartConfig.yAxisColumn,
          data: datasetData,
          backgroundColor: chartConfig.data.datasets[0]?.backgroundColor || 'rgba(75, 192, 192, 0.6)',
          borderColor: chartConfig.data.datasets[0]?.borderColor || 'rgba(75, 192, 192, 1)',
          borderWidth: chartConfig.data.datasets[0]?.borderWidth || 1,
        };
        datasets.push(lineDataset);
        break;
      case 'pie':
      case 'doughnut':
        const pieDataset: ChartDataset = {
          type: chartConfig.type,
          data: datasetData,
          backgroundColor: chartConfig.data.datasets[0]?.backgroundColor || [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9900'
          ],
        };
        datasets.push(pieDataset);
        break;
      default:
        const defaultDataset: ChartDataset = {
          data: [],
          label: '',
          type: 'bar'
        };
        datasets.push(defaultDataset);
        break;
    }

    newChartConfig.data = {
      labels: labels,
      datasets: datasets as any
    };

    console.log('processChartData: Final ChartConfig data:', newChartConfig.data);
    return newChartConfig;
  }

  public resetDashboard(): void {
    this.rawData.next([]);
    this.chartConfigs.next([]);
    this.filters.next([]);
    this.uploadedFilesMetadata.next([]); // Clear metadata on reset
    this.saveToLocalStorage();
    this.applyFilters();
  }

  public generateTrendingCharts(): void {
    const uploadedFiles = this.uploadedFilesMetadata.value;

    // File Type Distribution (Pie Chart)
    const fileTypeCounts = uploadedFiles.reduce((acc, file) => {
      acc[file.fileExtension] = (acc[file.fileExtension] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const fileTypeLabels = Object.keys(fileTypeCounts);
    const fileTypeData = Object.values(fileTypeCounts);

    const fileTypeChart: ChartConfig = {
      id: 'fileTypeDistribution',
      title: 'File Type Distribution',
      type: 'pie',
      data: {
        labels: fileTypeLabels,
        datasets: [{
          data: fileTypeData,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9900'
          ]
        }]
      },
      xAxisColumn: '', // Not applicable for pie chart
      yAxisColumn: ''  // Not applicable for pie chart
    };

    // Upload Frequency Over Time (Line Graph)
    const uploadFrequency: { [key: string]: number } = {};
    uploadedFiles.forEach(file => {
      const date = new Date(file.uploadTimestamp);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
      uploadFrequency[dateString] = (uploadFrequency[dateString] || 0) + 1;
    });

    const sortedDates = Object.keys(uploadFrequency).sort();
    const uploadFrequencyData = sortedDates.map(date => uploadFrequency[date]);

    const uploadFrequencyChart: ChartConfig = {
      id: 'uploadFrequencyOverTime',
      title: 'Upload Frequency Over Time',
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [{
          label: 'Number of Uploads',
          data: uploadFrequencyData,
          fill: false,
          borderColor: '#36A2EB'
        }]
      },
      xAxisColumn: 'Date', // Conceptual
      yAxisColumn: 'Uploads' // Conceptual
    };

    // Add these charts to the dashboard if they don't already exist
    const currentChartConfigs = this.chartConfigs.value;
    const newChartConfigs = [...currentChartConfigs];

    if (!newChartConfigs.some(chart => chart.id === fileTypeChart.id)) {
      newChartConfigs.push(fileTypeChart);
    }
    if (!newChartConfigs.some(chart => chart.id === uploadFrequencyChart.id)) {
      newChartConfigs.push(uploadFrequencyChart);
    }
    this.chartConfigs.next(newChartConfigs);
    this.saveToLocalStorage();
  }

  public updateColumnType(columnName: string, newType: string): void {
    const currentData = this.rawData.value;
    const updatedData = currentData.map(row => {
      const newRow = { ...row };
      let value = newRow[columnName];

      if (value === null || value === undefined || String(value).trim() === '') {
        // Keep null/empty as is, or convert to default for type if needed
        // For now, we'll just leave them as is, as they are handled by profiler
        return newRow;
      }

      switch (newType) {
        case 'number':
          const numValue = Number(value);
          newRow[columnName] = isNaN(numValue) ? null : numValue; // Convert to number, or null if invalid
          break;
        case 'boolean':
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue === 'true' || lowerValue === '1') {
              newRow[columnName] = true;
            } else if (lowerValue === 'false' || lowerValue === '0') {
              newRow[columnName] = false;
            } else {
              newRow[columnName] = null; // Or keep original, or some other default
            }
          } else if (typeof value === 'number') {
            newRow[columnName] = value === 1 ? true : (value === 0 ? false : null);
          } else {
            newRow[columnName] = null;
          }
          break;
        case 'date':
          const dateValue = new Date(value);
          newRow[columnName] = isNaN(dateValue.getTime()) ? null : dateValue; // Convert to Date object, or null if invalid
          break;
        case 'string':
          newRow[columnName] = String(value); // Convert to string
          break;
        default:
          // Do nothing for unknown types or if no conversion is needed
          break;
      }
      return newRow;
    });

    this.rawData.next(updatedData);
    this.applyFilters();
    this.saveToLocalStorage();
  }

  public setSummaryData(summary: any): void {
    this.summaryData.next(summary);
  }

  public getSummaryData(): Observable<any> {
    return this.summaryData.asObservable();
  }
}