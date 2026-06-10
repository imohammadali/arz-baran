import { CommonModule } from '@angular/common'
import { Component, ContentChild, EventEmitter, Injector, Input, Output, TemplateRef } from '@angular/core'
import { Utility } from '@shared/services/utility'
import { DialogModule } from 'primeng/dialog'
import { DrawerModule } from 'primeng/drawer'

@Component({
  selector: 'app-drawer',
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
  imports: [DialogModule, DrawerModule, CommonModule],
  standalone: true
})
export class DrawerComponent extends Utility {
  @Input() appendTo: any = 'body'
  private _isOpen = false
  @Input() get isOpen(): boolean {
    return this._isOpen as boolean
  }
  set isOpen(val: boolean) {
    this._isOpen = val
    if (this._isOpen) {
      this.checkVisible(this.innerWidth)
    } else {
      this.checkHide(this.innerWidth)
    }
  }
  @Output() isOpenChange: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() closeCallback: EventEmitter<void> = new EventEmitter<void>()
  @ContentChild(TemplateRef) contentTemplate: TemplateRef<any>

  visibleMobile = false
  visibleDesktop = false

  constructor(injector: Injector) {
    super(injector)
  }
  innerWidth = window.innerWidth
  checkVisible(innerWidth: number) {
    if (innerWidth > 480) {
      this.visibleDesktop = true
      this.visibleMobile = false
    } else {
      this.visibleMobile = true
      this.visibleDesktop = false
    }
  }
  checkHide(innerWidth: number) {
    if (innerWidth > 480) {
      this.visibleDesktop = false
    } else {
      this.visibleMobile = false
    }
  }
  onHideDrawer() {
    if (this._isOpen) {
      this.isOpenChange.emit(false)
    }
  }
}
