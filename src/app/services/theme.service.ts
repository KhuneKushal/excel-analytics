import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private static readonly THEME_KEY = 'theme';
  private static readonly DARK_THEME_CLASS = 'dark-theme';

  // Default to light theme
  public isDarkTheme = signal(false);

  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.loadTheme();
  }

  private loadTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem(ThemeService.THEME_KEY);
      if (savedTheme) {
        this.isDarkTheme.set(savedTheme === 'dark');
      }
    }
    this.updateBodyClass();
  }

  public toggleTheme(): void {
    this.isDarkTheme.set(!this.isDarkTheme());
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(ThemeService.THEME_KEY, this.isDarkTheme() ? 'dark' : 'light');
    }
    this.updateBodyClass();
  }

  private updateBodyClass(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.isDarkTheme()) {
        document.body.classList.add(ThemeService.DARK_THEME_CLASS);
      } else {
        document.body.classList.remove(ThemeService.DARK_THEME_CLASS);
      }
    }
  }
}
