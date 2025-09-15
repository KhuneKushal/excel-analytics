import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ChartConfig } from '../components/chart/chart.component';

@Injectable({
  providedIn: 'root'
})
export class DashboardActionsService {
  private downloadPdfSubject = new Subject<void>();
  private importConfigSubject = new Subject<void>();
  private importedConfigSubject = new Subject<ChartConfig[]>();

  downloadPdf$ = this.downloadPdfSubject.asObservable();
  importConfig$ = this.importConfigSubject.asObservable();
  importedConfig$ = this.importedConfigSubject.asObservable();

  triggerDownloadPdf(): void {
    this.downloadPdfSubject.next();
  }

  triggerImportConfig(): void {
    this.importConfigSubject.next();
  }

  sendImportedConfig(config: ChartConfig[]): void {
    this.importedConfigSubject.next(config);
  }
}