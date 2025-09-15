import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ChartConfiguration,
  ChartEvent,
  ChartType,
  Chart,
  registerables,
  ActiveElement
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// Register Chart.js components
Chart.register(...registerables);

// Defines the configuration for a chart component.
// This interface
export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  data: ChartConfiguration['data'];
  options?: ChartConfiguration['options'];
  xAxisColumn?: string;
  yAxisColumn?: string;
  cols?: number;
  rows?: number;
  x?: number;
  y?: number;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [BaseChartDirective, CommonModule],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() id: string = '';
  @Input() type: ChartType = 'bar';
  @Input() data: ChartConfiguration['data'] = { labels: [], datasets: [] };
  @Input() options: ChartConfiguration['options'] = {};
  @Input() chartConfig?: ChartConfig;
  @Output() segmentClick = new EventEmitter<{ label: string; value: any }>();

  public chartOptions: ChartConfiguration['options'] = {};
  private isInitialized = false;

  constructor(private cdr: ChangeDetectorRef) {}

  // Initializes the component by setting up chart options.
  ngOnInit(): void {
    console.log('Chart component initialized with:', { id: this.id, type: this.type, hasData: !!this.data });
    this.setupChartOptions();
  }

  ngAfterViewInit(): void {
    // Mark as initialized after view init
    this.isInitialized = true;
    this.cdr.markForCheck();
  }

  // Cleans up resources when the component is destroyed.
  ngOnDestroy(): void {
    this.isInitialized = false;
  }

  // Sets up the default and type-specific options for the chart.
  private setupChartOptions(): void {
    const defaultOptions: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 12
          },
          cornerRadius: 6,
          displayColors: true
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    };

    // Type-specific options
    switch (this.type) {
      case 'bar':
      case 'line':
        this.chartOptions = {
          ...defaultOptions,
          scales: {
            x: {
              beginAtZero: true,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              ticks: {
                font: {
                  size: 11
                }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              },
              ticks: {
                font: {
                  size: 11
                }
              }
            }
          }
        };
        break;
      case 'pie':
      case 'doughnut':
        this.chartOptions = {
          ...defaultOptions,
          plugins: {
            ...defaultOptions.plugins,
            legend: {
              ...defaultOptions.plugins?.legend,
              position: 'right'
            }
          }
        };
        break;
      case 'scatter':
        this.chartOptions = {
          ...defaultOptions,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            y: {
              type: 'linear',
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        };
        break;
      case 'radar':
        this.chartOptions = {
          ...defaultOptions,
          scales: {
            r: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        };
        break;
      default:
        this.chartOptions = defaultOptions;
    }

    // Merge with provided options
    if (this.options) {
      this.chartOptions = this.deepMerge(this.chartOptions, this.options);
    }
  }

  // Handles click events on the chart and emits the clicked segment's data.
  public chartClicked({ event, active }: { event?: ChartEvent, active?: any[] }): void {
    try {
      console.log('Chart clicked:', { event, active });
      
      if (!active || active.length === 0) {
        console.log('No active elements in chart click');
        return;
      }

      const activeElement = active[0];
      if (!activeElement) {
        console.log('No active element found');
        return;
      }

      // For Chart.js v3+, the structure is different
      const dataIndex = activeElement.index;
      const datasetIndex = activeElement.datasetIndex;

      if (dataIndex === undefined || datasetIndex === undefined) {
        console.log('Missing dataIndex or datasetIndex');
        return;
      }

      const labels = this.data.labels;
      const datasets = this.data.datasets;

      if (!labels || !datasets || !datasets[datasetIndex]) {
        console.log('Missing labels or datasets');
        return;
      }

      const label = labels[dataIndex] as string;
      const value = datasets[datasetIndex].data[dataIndex];

      console.log('Chart click data:', { label, value });

      if (label !== undefined && value !== undefined) {
        this.segmentClick.emit({ label, value });
      }
    } catch (error) {
      console.error('Error handling chart click:', error);
    }
  }

  // Deeply merges two objects, used for merging chart options.
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // Getter for the final chart options to be used in the template.
  get finalOptions(): ChartConfiguration['options'] {
    return this.chartOptions;
  }

  // Validates if the chart has sufficient data to be rendered.
  get isValidData(): boolean {
    try {
      const isValid = this.data && 
             this.data.datasets && 
             this.data.datasets.length > 0 && 
             this.data.datasets[0].data && 
             Array.isArray(this.data.datasets[0].data) &&
             this.data.datasets[0].data.length > 0;
      
      console.log('Chart data validation:', { 
        id: this.id, 
        isValid, 
        datasets: this.data?.datasets?.length || 0,
        firstDatasetLength: this.data?.datasets?.[0]?.data?.length || 0
      });
      
      return isValid;
    } catch (error) {
      console.error('Error validating chart data:', error);
      return false;
    }
  }

  // Getter to check if component is ready to render
  get isReady(): boolean {
    return this.isInitialized && this.isValidData;
  }
}