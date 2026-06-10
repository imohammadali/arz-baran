import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {HasPermissionDirective} from "@core/permission/permission.directive";
import {PermissionService} from "@core/permission/permission.service";



@NgModule({
  declarations: [
    HasPermissionDirective
  ],
  exports: [
    HasPermissionDirective
  ],
  providers: [PermissionService],
  imports: [
    CommonModule
  ]
})
export class PermissionModule { }
