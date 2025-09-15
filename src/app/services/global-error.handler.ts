import { ErrorHandler, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorLoggerService } from './error-logger.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(
    private router: Router,
    private errorLogger: ErrorLoggerService
  ) {}

  handleError(error: Error | HttpErrorResponse): void {
    this.errorLogger.logError(error);

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 404:
          // For API 404s, log but don't redirect
          if (error.url?.includes('/api/')) {
            console.warn(`API endpoint not found: ${error.url}`);
          } else {
            this.router.navigate(['/404']);
          }
          break;
        case 500:
          this.router.navigate(['/500']);
          break;
        default:
          // For other HTTP errors, only redirect if it's not an API call
          if (!error.url?.includes('/api/')) {
            this.router.navigate(['/500']);
          }
      }
    } else {
      // For non-HTTP errors (runtime errors), navigate to 500
      this.router.navigate(['/500']);
    }
  }
}