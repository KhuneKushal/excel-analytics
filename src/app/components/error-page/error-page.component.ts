import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="error-container">
      <h1>{{ errorCode === 404 ? 'Page Not Found' : 'Internal Server Error' }}</h1>
      <p>{{ errorMessage }}</p>
      <button mat-raised-button color="primary" (click)="goHome()">
        Return to Home
      </button>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      color: #666;
    }
  `]
})
export class ErrorPageComponent {
  @Input() errorCode: 404 | 500 = 404;
  
  get errorMessage(): string {
    return this.errorCode === 404
      ? 'The page you are looking for does not exist.'
      : 'Something went wrong. Please try again later.';
  }

  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/']);
  }
}