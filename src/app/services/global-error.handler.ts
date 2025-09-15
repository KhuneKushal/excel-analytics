import { ErrorHandler, Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private router: Router) {}

  handleError(error: any): void {
    console.error('An error occurred:', error);

    // Navigate to 500 error page for unhandled errors
    if (error.status !== 404) {
      this.router.navigate(['/500']);
    }
  }
}