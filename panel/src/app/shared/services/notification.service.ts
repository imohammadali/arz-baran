import { Injectable } from '@angular/core'
import { MessageService } from 'primeng/api'
import { TranslateService } from '@ngx-translate/core'

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private messageService: MessageService,
    private translateService: TranslateService
  ) {}

  info(data: IMessageService) {
    this.show({
      type: 'info',
      ...data
    })
  }

  success(data: IMessageService) {
    this.show({
      type: 'success',
      ...data
    })
  }

  warn(data: IMessageService) {
    this.show({
      type: 'warn',
      ...data
    })
  }

  error(data: IMessageService) {
    this.show({
      type: 'error',
      ...data
    })
  }

  clear() {
    this.messageService.clear()
  }

  private show(data: IMessageService) {
    this.messageService.add({
      severity: data?.type || 'success',
      summary: data?.title ? this.translateService.instant(data?.title, data?.titleParams || {}) : '',
      detail: data?.message ? this.translateService.instant(data?.message, data?.messageParams || {}) : '',
      closable: data?.closable || true,
      data: data?.data,
      life: 5000
    })
  }
}

export interface IMessageService {
  type?: 'success' | 'info' | 'warn' | 'error'
  title?: string
  titleParams?: any
  message?: string
  messageParams?: any
  closable?: boolean
  data?: any
}
