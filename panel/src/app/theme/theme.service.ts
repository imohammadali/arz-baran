import { Injectable } from '@angular/core'

export type AppTheme = 'default-theme' | 'dark-theme' | 'blue-theme' | 'purple-theme'

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  /**
   * Theme management is handled by AppComponent via NgRx store.
   * This service is kept for type exports and potential future use.
   */
  constructor() {}
}
