import { Injectable } from '@angular/core'
import { LocalStorageService } from '@shared/services/local-storage/local-storage.service'
import { FeaturesConstant } from '@shared/services/permission/features.constant'

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  constructor(private _localStorage: LocalStorageService) {}

  featuresConstant = FeaturesConstant

  get features(): string[] {
    return this._localStorage.getItem('user')?.access || []
  }

  checkAccess(accessList: string[], toast = false): boolean {
    return true
  }

  checkAccessToModule(moduleName) {
    return true
  }

  checkUserType(): 'admin' | 'user' | 'vista_bi' | 'vista_ticket' {
    return 'admin'
  }

  equalRole(roles: ('admin' | 'user' | 'vista_bi' | 'vista_ticket')[]): boolean {
    return true
  }

  isLoggedUser() {
    return this._localStorage.getItem('user')?.token
  }
}
