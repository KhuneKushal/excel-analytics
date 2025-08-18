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

  async downloadDashboardAsPdf(dashboardElement: HTMLElement, charts: ChartConfig[]): Promise<void> {
    console.log('downloadDashboardAsPdf called');
    console.log('dashboardElement:', dashboardElement);
    if (!isPlatformBrowser(this.platformId)) {
      this.snackBar.open('Dashboard export not available on server.', 'Close', { duration: 3000 });
      return;
    }

    if (!dashboardElement) {
      this.snackBar.open('Dashboard element not found.', 'Close', { duration: 3000 });
      return;
    }

    try {
      console.log('Attempting to import html2canvas and jspdf');
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      console.log('html2canvas and jspdf imported successfully');

      // Add a small delay to ensure all elements are rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas.default(dashboardElement, { useCORS: true, allowTaint: true, foreignObjectRendering: false, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
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

      // Add summaries for each chart
      pdf.addPage(); // New page for summaries
      let yOffset = 10;
      pdf.setFontSize(18); // Larger title
      pdf.setTextColor(40, 40, 40); // Darker color
      pdf.text('Dashboard Summary', 10, yOffset);
      yOffset += 15;

      // Basic Analysis Overview
      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      pdf.text('This dashboard provides a comprehensive overview of key data points.', 10, yOffset);
      yOffset += 7;
      pdf.text('Effective data analysis involves identifying trends, patterns, and anomalies.', 10, yOffset);
      yOffset += 7;
      pdf.text('Utilize the charts below to gain insights and support data-driven decisions.', 10, yOffset);
      yOffset += 15; // Space before chart summaries

      charts.forEach((chart, index) => {
        pdf.setFontSize(14); // Chart title
        pdf.setTextColor(0, 0, 0); // Black
        pdf.text(`${index + 1}. Chart: ${chart.title || 'Untitled Chart'}`, 10, yOffset);
        yOffset += 8;

        pdf.setFontSize(10); // Details
        pdf.setTextColor(80, 80, 80); // Gray
        pdf.text(`   Type: ${chart.type || 'N/A'}`, 15, yOffset);
        yOffset += 5;
        pdf.text(`   X-Axis: ${chart.xAxisColumn || 'N/A'}`, 15, yOffset);
        yOffset += 5;
        pdf.text(`   Y-Axis: ${chart.yAxisColumn || 'N/A'}`, 15, yOffset);
        yOffset += 10; // More space between charts

        if (yOffset > pageHeight - 30) { // Check if new page is needed
          pdf.addPage();
          yOffset = 10;
        }
      });

      pdf.save('dashboard.pdf');
      this.snackBar.open('Dashboard exported as PDF.', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting dashboard as PDF:', error);
      this.snackBar.open('Failed to export dashboard as PDF.', 'Close', { duration: 3000 });
    }
  }
}
