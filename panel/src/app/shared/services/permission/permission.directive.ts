import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core'
import { PermissionService } from '@shared/services/permission/permission.service'

@Directive({
  selector: '[hasPermission]'
})
export class HasPermissionDirective implements OnInit {
  private _permissions = null

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
    private permissionService: PermissionService
  ) {}
  @Input() set hasPermission(val: string[]) {
    this._permissions = val
  }

  ngOnInit(): void {
    if (this.permissionService.checkAccess(this._permissions)) {
      this.viewContainerRef.createEmbeddedView(this.templateRef)
    } else {
      this.viewContainerRef.clear()
    }
  }
}
