import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { DashboardService } from './dashboard.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ChartConfig } from '../components/chart/chart.component';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  constructor() { }

  private getAxisTitle(chart: ChartConfig, axis: 'x' | 'y'): string {
    if (!chart.options?.scales) return axis === 'y' ? 'Value' : 'Category';
    const scale = chart.options.scales[axis];
    return (scale as any)?.title?.text || (axis === 'y' ? 'Value' : 'Category');
  }

  generateChartDescription(chart: ChartConfig): string {
    const metricName = this.getAxisTitle(chart, 'y');
    const dimensionName = this.getAxisTitle(chart, 'x');
    
    switch (chart.type) {
      case 'bar':
        return `This bar chart illustrates the distribution of ${metricName} across different ${dimensionName}. ` +
               `The visualization helps identify key patterns and variations in your data, making it easier to spot trends and outliers.`;
      case 'line':
        return `The line chart tracks ${metricName} over ${dimensionName}, showing the temporal evolution of your data. ` +
               `This visualization is particularly useful for identifying trends, seasonality, and long-term patterns in your time-series data.`;
      case 'pie':
        return `This pie chart shows the proportional distribution of ${metricName}. ` +
               `Each segment represents a distinct category, allowing you to quickly understand the relative contributions of different components to the whole.`;
      case 'doughnut':
        return `The doughnut chart displays the composition of ${metricName} by category. ` +
               `This visualization emphasizes the relative proportions while maintaining a clear and elegant presentation.`;
      default:
        return `This chart presents the relationship between ${metricName} and ${dimensionName}, helping you gain insights from your data.`;
    }
  }

  exportData(format: 'csv' | 'xlsx' | 'json', filename: string = 'exported_data'): void {
    this.dashboardService.getFilteredData().subscribe(data => {
      if (!data || data.length === 0) {
        this.snackBar.open('No data to export.', 'Close', { duration: 3000 });
        return;
      }

      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      switch (format) {
        case 'csv':
          const csv = XLSX.utils.sheet_to_csv(ws);
          const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          saveAs(csvBlob, `${filename}.csv`);
          break;
        case 'xlsx':
          XLSX.writeFile(wb, `${filename}.xlsx`);
          break;
        case 'json':
          const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
          saveAs(jsonBlob, `${filename}.json`);
          break;
        default:
          this.snackBar.open('Unsupported export format.', 'Close', { duration: 3000 });
          break;
      }
      this.snackBar.open(`Data exported as ${format.toUpperCase()}.`, 'Close', { duration: 3000 });
    });
  }

  downloadJson(data: any, filename: string = 'config'): void {
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    saveAs(jsonBlob, `${filename}.json`);
    this.snackBar.open(`Configuration exported as JSON.`, 'Close', { duration: 3000 });
  }

  uploadJson(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!isPlatformBrowser(this.platformId)) {
        this.snackBar.open('File upload not available on server.', 'Close', { duration: 3000 });
        reject('Not on browser');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';

      input.onchange = (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
              const content = e.target?.result as string;
              const json = JSON.parse(content);
              this.snackBar.open('Configuration imported successfully.', 'Close', { duration: 3000 });
              resolve(json);
            } catch (error) {
              this.snackBar.open('Failed to parse JSON file.', 'Close', { duration: 3000 });
              reject(error);
            }
          };
          reader.readAsText(file);
        } else {
          this.snackBar.open('No file selected.', 'Close', { duration: 3000 });
          reject('No file selected');
        }
        document.body.removeChild(input); // Clean up the input element
      };

      input.onerror = (error) => {
        this.snackBar.open('File input error.', 'Close', { duration: 3000 });
        reject(error);
        document.body.removeChild(input); // Clean up the input element
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  async exportChartAsImage(chartElementId: string, filename: string = 'chart'): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.snackBar.open('Chart export not available on server.', 'Close', { duration: 3000 });
      return;
    }

    const element = document.getElementById(chartElementId);
    if (!element) {
      this.snackBar.open('Chart element not found.', 'Close', { duration: 3000 });
      return;
    }

    try {
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(element);
      canvas.toBlob(function(blob) {
        if (blob) {
          saveAs(blob, `${filename}.png`);
        }
      });
      this.snackBar.open('Chart exported as PNG.', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting chart as image:', error);
      this.snackBar.open('Failed to export chart as PNG.', 'Close', { duration: 3000 });
    }
  }

  async exportChartAsPdf(chartElementId: string, filename: string = 'chart'): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.snackBar.open('Chart export not available on server.', 'Close', { duration: 3000 });
      return;
    }

    const element = document.getElementById(chartElementId);
    if (!element) {
      this.snackBar.open('Chart element not found.', 'Close', { duration: 3000 });
      return;
    }

    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
      const canvas = await html2canvas.default(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${filename}.pdf`);
      this.snackBar.open('Chart exported as PDF.', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting chart as PDF:', error);
      this.snackBar.open('Failed to export chart as PDF.', 'Close', { duration: 3000 });
    }
  }

  async downloadDashboardAsPdf(charts: ChartConfig[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      this.snackBar.open('Dashboard export not available on server.', 'Close', { duration: 3000 });
      return;
    }

    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const chartWidth = (pageWidth - 40) / 3; // 3 columns, 20mm margin on each side
      const chartHeight = (pageHeight - 40) / 2; // 2 rows, 20mm margin on each side

      let xOffset = 20;
      let yOffset = 20;
      let chartsOnPage = 0;

      for (let i = 0; i < charts.length; i++) {
        const chart = charts[i];
        const element = document.getElementById(chart.id);
        if (element) {
          // Add chart title
          pdf.setFontSize(12);
          pdf.text(chart.title || 'Untitled Chart', xOffset, yOffset - 5); // Position title above chart

          const canvas = await html2canvas.default(element, { scale: 3 }); // Increased scale for clarity
          const imgData = canvas.toDataURL('image/png');

          if (chartsOnPage > 0 && chartsOnPage % 6 === 0) {
            pdf.addPage();
            xOffset = 20;
            yOffset = 20;
          }

          pdf.addImage(imgData, 'PNG', xOffset, yOffset, chartWidth, chartHeight);

          xOffset += chartWidth + 10; // Move to next column with 10mm spacing
          if ((i + 1) % 3 === 0) { // If 3 charts in a row, move to next row
            xOffset = 20;
            yOffset += chartHeight + 10;
          }
          chartsOnPage++;
        }
      }

      pdf.save('dashboard.pdf');
      this.snackBar.open('Dashboard exported as PDF.', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting dashboard as PDF:', error);
      this.snackBar.open('Failed to export dashboard as PDF.', 'Close', { duration: 3000 });
    }
  }
}
