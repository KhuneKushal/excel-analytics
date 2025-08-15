import { Injectable } from '@angular/core';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ChartData {
  type: ChartType;
  data: ChartConfiguration['data'];
  options?: ChartConfiguration['options'];
}

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private chartsSubject = new BehaviorSubject<ChartData[]>([]);
  charts$ = this.chartsSubject.asObservable();

  constructor() {
    // Register the chart.js components we'll need
    Chart.register(...registerables);
  }

  createChart(data: any[], config: {
    type: ChartType;
    xAxis: string;
    yAxis: string;
    title?: string;
  }): ChartData {
    const chartData: ChartData = {
      type: config.type,
      data: {
        labels: data.map(item => item[config.xAxis]),
        datasets: [{
          label: config.title || config.yAxis,
          data: data.map(item => item[config.yAxis]),
          backgroundColor: this.generateColors(data.length),
          borderColor: this.generateColors(data.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!config.title,
            text: config.title || ''
          }
        }
      }
    };

    return chartData;
  }

  addChart(chart: ChartData): void {
    const currentCharts = this.chartsSubject.getValue();
    this.chartsSubject.next([...currentCharts, chart]);
  }

  removeChart(index: number): void {
    const currentCharts = this.chartsSubject.getValue();
    currentCharts.splice(index, 1);
    this.chartsSubject.next(currentCharts);
  }

  private generateColors(count: number): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(`hsl(${(i * 360) / count}, 70%, 50%)`);
    }
    return colors;
  }

  updateChartData(index: number, newData: ChartData): void {
    const currentCharts = this.chartsSubject.getValue();
    currentCharts[index] = newData;
    this.chartsSubject.next(currentCharts);
  }

  getCharts(): Observable<ChartData[]> {
    return this.charts$;
  }
}