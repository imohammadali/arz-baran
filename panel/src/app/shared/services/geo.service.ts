import { Injectable } from '@angular/core'
import { Observable, ReplaySubject } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class GeoService {
  private coords$ = new ReplaySubject<{ lat: number; lng: number }>(1)
  init() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.coords$.next({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          })
          this.coords$.complete()
        },
        err => {
          console.error('Geo error:', err)
          this.coords$.next({ lat: 0, lng: 0 })
          this.coords$.complete()
        },
        {
          enableHighAccuracy: true,
          timeout: 2000
        }
      )
    } else {
      this.coords$.next({ lat: 0, lng: 0 })
      this.coords$.complete()
    }
  }

  getCoords(): Observable<{ lat: number; lng: number }> {
    return this.coords$.asObservable()
  }
}
