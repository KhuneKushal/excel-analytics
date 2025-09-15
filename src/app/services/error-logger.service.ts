import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ErrorLoggerService {
  constructor() {}

  logError(error: Error | HttpErrorResponse | string) {
    if (error instanceof HttpErrorResponse) {
      console.error('HTTP Error:', {
        url: error.url,
        status: error.status,
        statusText: error.statusText,
        message: error.message
      });
    } else if (error instanceof Error) {
      console.error('Application Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      console.error('Other Error:', error);
    }

    // In production, you might want to send this to a logging service
    if (process.env['NODE_ENV'] === 'production') {
      // Implement production error logging here
      // For example, sending to a logging service or analytics
    }
  }
}