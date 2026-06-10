import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { authLogout } from '@core/auth/auth.actions'
import { AppState } from '@core/core.state'
import { Store } from '@ngrx/store'
import { IMessageService } from '@shared/services/notification.service'
import { MessageService } from 'primeng/api'
import { Observable, Subject, throwError as observableThrowError } from 'rxjs'
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators'

/** Passes HttpErrorResponse to application-wide error handler */
@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  err_subject = new Subject()

  constructor( private messageService: MessageService, private store: Store<AppState>) {
    this.err_subject.pipe(debounceTime(1000), distinctUntilChanged()).subscribe(data => {
      this._error(data)
    })
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError(err => {
        if (typeof err.error?.text == 'function') {
          err.error?.text().then(blobErr => {
            if (JSON.parse(blobErr)?.error) {
              err.error = JSON.parse(blobErr).error
            }
            this._showError(err, request?.url)
          })
        } else {
          this._showError(err, request?.url)
        }
        return observableThrowError(err)
      })
    )
  }

  private _error(data: IMessageService) {
    this.messageService.add({
      severity: 'error',
      summary: data?.title,
      detail: data?.message,
      closable: data?.closable || true,
      life: 5000
    })
  }

  private _showError(err, url) {
    switch (err.status) {
      case 400:
        if (err.error['error'] != undefined) {
          if (err.error.error === 'Error in loading user' || err.error.error === 'خطا در یافتن کاربر') {
            console.log('logout error in loading user')
            this.store.dispatch(authLogout())
          }
          this.err_subject.next({ message: err.error['message'], title: err.error['message'] })
        } else if (err.error) {
          this.err_subject.next({ message: err.error['message'] })
        }
        break
      case 401:
        // this.err_subject.next({ message: err.error['message'], title: '401' })
        // this.store.dispatch(authLogout())
        break
      case 403:
        this.err_subject.next({ message: err.error['message'], title: '403' })
        break
      case 404:
        this.err_subject.next({ message: err.error['error'], title: '404' })
        break
      case 500:
      case 501:
      case 502:
        if (!['callcenter/longpolling/get'].includes(url)) {
          this.err_subject.next({ message: err.error['message'], title: err.status })
        }
        break
      case 503:
      case 504:
      case 505:
      case 506:
      case 507:
      case 508:
      case 510:
      case 511:
        this.err_subject.next({ message: err.error['message'], title: err.status })
        break
      case 0:
        this.err_subject.next({ message: 'شما آفلاین هستید / your are offline', title: 'حالت آفلاین / offline' })
        break
      default:
        if (!err.status) {
          this.err_subject.next({ message: 'feedback.unknown_error' })
        } else {
          this.err_subject.next({ message: err.error['message'] })
        }

        break
    }
  }
}
