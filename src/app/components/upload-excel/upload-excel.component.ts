import { Component, inject, PLATFORM_ID, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import * as XLSX from 'xlsx';
import { DashboardService } from '../../services/dashboard.service';

interface FileMetadata {
  fileName: string;
  fileExtension: string;
  uploadTimestamp: Date;
  fileSize: number;
  rowCount: number;
  columnCount: number;
}

@Component({
  selector: 'app-upload-excel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './upload-excel.component.html',
  styleUrls: ['./upload-excel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadExcelComponent {
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);
  private cdr = inject(ChangeDetectorRef);

  displayedColumns: string[] = [];
  dataSource: any[] = [];
  previewData: any[] = [];
  uploadProgress: number = 0;
  rowCount: number = 0;
  isParsing: boolean = false;
  isProcessing: boolean = false;
  uploadedFileName: string = '';
  uploadTimestamp: Date | null = null;
  fileMetadata: FileMetadata | null = null;
  
  private readonly MAX_PREVIEW_ROWS = 10;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  private readonly SUPPORTED_EXTENSIONS = ['xlsx', 'csv', 'tsv', 'json'];

  readonly acceptedFileTypes = '.xlsx,.csv,.tsv,.json';

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      this.showError('No file selected');
      return;
    }

    if (!this.validateFile(file)) {
      // Clear the input
      target.value = '';
      return;
    }

    this.resetState();
    this.parseFile(file);
  }

  private validateFile(file: File): boolean {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      this.showError(`File size exceeds ${this.formatFileSize(this.MAX_FILE_SIZE)}. Please choose a smaller file.`);
      return false;
    }

    if (file.size === 0) {
      this.showError('The selected file is empty.');
      return false;
    }

    // Check file extension
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !this.SUPPORTED_EXTENSIONS.includes(fileExtension)) {
      this.showError(`Invalid file type. Please upload one of: ${this.SUPPORTED_EXTENSIONS.join(', ')}`);
      return false;
    }

    return true;
  }

  private resetState(): void {
    this.isParsing = false;
    this.isProcessing = false;
    this.uploadProgress = 0;
    this.rowCount = 0;
    this.dataSource = [];
    this.previewData = [];
    this.displayedColumns = [];
    this.fileMetadata = null;
    this.cdr.markForCheck();
  }

  private parseFile(file: File): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.showError('File parsing is only available in the browser.');
      return;
    }

    this.isParsing = true;
    this.uploadedFileName = file.name;
    this.uploadTimestamp = new Date();
    this.cdr.markForCheck();

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      switch (fileExtension) {
        case 'csv':
        case 'tsv':
          this.parseCsvFile(file, fileExtension);
          break;
        case 'xlsx':
          this.parseExcelFile(file);
          break;
        case 'json':
          this.parseJsonFile(file);
          break;
        default:
          this.showError('Unsupported file format');
          this.isParsing = false;
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      this.showError('An unexpected error occurred while parsing the file');
      this.isParsing = false;
      this.cdr.markForCheck();
    }
  }

  private async parseCsvFile(file: File, fileExtension: string): Promise<void> {
    console.log('Parsing CSV file:', file.name, 'Size:', file.size, 'Type:', file.type); // ADDED LOG
    try {
      const Papa = await import('papaparse');
      
      Papa.default.parse(file, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: false,
        delimiter: fileExtension === 'tsv' ? '	' : '',
        complete: (results) => {
          if (results && Array.isArray(results.data)) {
            if (results.data.length === 0) { // ADDED CHECK FOR EMPTY DATA
              this.showError('The uploaded file contains no data rows.');
              this.isParsing = false;
              this.cdr.markForCheck();
              return;
            }
            this.handleParseComplete(results.data, file);
          } else {
            console.error('PapaParse complete callback: results or results.data is invalid', results);
            this.showError('Failed to parse file: No valid data found or an unexpected error occurred.');
            this.isParsing = false;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          this.showError(`Error parsing ${fileExtension.toUpperCase()} file: ${error.message}`);
          this.isParsing = false;
          this.cdr.markForCheck();
        }
      });
    } catch (error) {
      console.error('Failed to load CSV parser:', error);
      this.showError('Failed to load CSV parser. Please refresh the page and try again.');
      this.isParsing = false;
      this.cdr.markForCheck();
    }
  }

  private parseExcelFile(file: File): void {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        this.uploadProgress = Math.min((event.loaded / event.total) * 90, 90);
        this.cdr.markForCheck();
      }
    };
    
    reader.onload = (e) => {
      try {
        const bstr = e.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        this.handleParseComplete(data, file);
      } catch (error) {
        console.error('Excel parsing error:', error);
        this.showError('Error parsing Excel file. Please ensure it\'s a valid .xlsx file.');
        this.isParsing = false;
        this.cdr.markForCheck();
      }
    };
    
    reader.onerror = () => {
      this.showError('Error reading Excel file');
      this.isParsing = false;
      this.cdr.markForCheck();
    };
    
    reader.readAsBinaryString(file);
  }

  private parseJsonFile(file: File): void {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        this.uploadProgress = Math.min((event.loaded / event.total) * 90, 90);
        this.cdr.markForCheck();
      }
    };
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        
        let arrayData: any[] = [];
        
        if (Array.isArray(jsonData)) {
          arrayData = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
          const firstArray = Object.values(jsonData).find(val => Array.isArray(val)) as any[];
          if (firstArray) {
            arrayData = firstArray;
          } else {
            this.showError('JSON file does not contain a recognizable array of data.');
            this.isParsing = false;
            this.cdr.markForCheck();
            return;
          }
        }
        
        this.handleParseComplete(arrayData, file);
      } catch (error) {
        console.error('JSON parsing error:', error);
        this.showError('Invalid JSON file. Please check the file format.');
        this.isParsing = false;
        this.cdr.markForCheck();
      }
    };
    
    reader.onerror = () => {
      this.showError('Error reading JSON file');
      this.isParsing = false;
      this.cdr.markForCheck();
    };
    
    reader.readAsText(file);
  }

  private handleParseComplete(data: any[], file: File): void {
    this.uploadProgress = 90;
    this.isProcessing = true;
    this.cdr.markForCheck();

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      this.processParsedData(data, file);
    }, 100);
  }

  private processParsedData(data: any[], file: File): void {
    try {
      if (!data || data.length === 0) {
        this.showError('No data found in the file.');
        this.isParsing = false;
        this.isProcessing = false;
        this.cdr.markForCheck();
        return;
      }

      const { headers, rows } = this.extractHeadersAndRows(data);
      
      if (headers.length === 0) {
        this.showError('No valid column headers found in the file.');
        this.isParsing = false;
        this.isProcessing = false;
        this.cdr.markForCheck();
        return;
      }

      const validRows = this.filterValidRows(rows);
      
      if (validRows.length === 0) {
        this.showError('No valid data rows found in the file.');
        this.isParsing = false;
        this.isProcessing = false;
        this.cdr.markForCheck();
        return;
      }

      const processedData = this.processRows(headers, validRows);
      
      // Set component properties
      this.displayedColumns = headers;
      this.dataSource = processedData;
      this.rowCount = processedData.length;
      this.previewData = processedData.slice(0, this.MAX_PREVIEW_ROWS);
      
      // Create file metadata
      this.fileMetadata = {
        fileName: file.name,
        fileExtension: file.name.split('.').pop()?.toLowerCase() || '',
        uploadTimestamp: this.uploadTimestamp || new Date(),
        fileSize: file.size,
        rowCount: this.rowCount,
        columnCount: headers.length
      };

      // Send data to dashboard service
      this.dashboardService.setData(processedData, this.fileMetadata);
      
      this.uploadProgress = 100;
      this.isParsing = false;
      this.isProcessing = false;
      
      this.showSuccess(
        `Successfully loaded ${this.rowCount} rows with ${headers.length} columns.`
      );
      
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error processing data:', error);
      this.showError('An error occurred while processing the file data.');
      this.isParsing = false;
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  private extractHeadersAndRows(data: any[]): { headers: string[], rows: any[] } {
    let headers: string[] = [];
    let rows: any[] = [];

    if (Array.isArray(data[0])) {
      // CSV/Excel format - first row is headers
      headers = data[0].map((header: any, index: number) => 
        header && String(header).trim() ? String(header).trim() : `Column_${index + 1}`
      );
      rows = data.slice(1);
    } else if (typeof data[0] === 'object' && data[0] !== null) {
      // JSON format - keys are headers
      headers = Object.keys(data[0]);
      rows = data;
    }

    return { headers, rows };
  }

  private filterValidRows(rows: any[]): any[] {
    return rows.filter((row: any) => {
      if (Array.isArray(row)) {
        return row.some((cell: any) => 
          cell !== null && cell !== undefined && String(cell).trim() !== ''
        );
      } else if (typeof row === 'object' && row !== null) {
        return Object.values(row).some((cell: any) => 
          cell !== null && cell !== undefined && String(cell).trim() !== ''
        );
      }
      return false;
    });
  }

  private processRows(headers: string[], rows: any[]): any[] {
    return rows.map((row) => {
      const obj: { [key: string]: any } = {};
      
      headers.forEach((key, index) => {
        let value = Array.isArray(row) ? row[index] : row[key];
        
        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        } else {
          value = String(value).trim();
          
          // Try to convert to number if applicable
          if (value !== '' && !isNaN(Number(value)) && isFinite(Number(value))) {
            const numValue = Number(value);
            // Don't convert strings that start with 0 (except '0' itself and decimals)
            if (!value.startsWith('0') || value === '0' || value.includes('.')) {
              value = numValue;
            }
          }
        }
        
        obj[key] = value;
      });
      
      return obj;
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: ['success-snackbar']
    });
  }

  public clearData(): void {
    this.resetState();
    this.dashboardService.resetDashboard();
    this.showSuccess('Data cleared successfully');
  }

  get formattedFileSize(): string {
    return this.fileMetadata ? this.formatFileSize(this.fileMetadata.fileSize) : '';
  }

  get hasData(): boolean {
    return this.previewData.length > 0;
  }

  get isLoading(): boolean {
    return this.isParsing || this.isProcessing;
  }

  public trackByColumn = (index: number, column: string): string => {
    return column;
  }
}