import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms'
import { Observable } from 'rxjs'
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators'

import { ApiService } from '../services/api.service'

export class CustomValidators {
  static _api: ApiService
  static email: RegExp = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  static domain: RegExp = /^(?:(?:(?:[a-zA-z\-]+)\:\/{1,3})?(?:[a-zA-Z0-9])(?:[a-zA-Z0-9\-\.]){1,61}(?:\.[a-zA-Z]{2,})+|\[(?:(?:(?:[a-fA-F0-9]){1,4})(?::(?:[a-fA-F0-9]){1,4}){7}|::1|::)\]|(?:(?:[0-9]{1,3})(?:\.[0-9]{1,3}){3}))(?:\:[0-9]{1,5})?$/i
  static numberOnly: RegExp = /^[0-9]*$/i
  static desimalNumberOnly: RegExp = /^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)$/ //   ***include number and decimal number like 1, 20, 34.5, 3.2, ...
  // static ip: RegExp = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  static ip: RegExp = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\/([1-2][0-9]|3[0-2]|[0-9]))?$/
  static framedRoute: RegExp = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\/([1-2][0-9]|3[0-2]|[0-9]))$/
  static ip_range: RegExp = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(0)(\/([1-2][0-9]|3[0-2]|[0-9]))$/
  static msisdn: RegExp = /^989\d{9}$/
  static msisdnForSearch: RegExp = /^(989|09|9)(\d{2})\d{7}$/
  static phoneNumber: RegExp = /^(989|09|9)\d{9}$/
  static postalCode: RegExp = /^[0-9]{10}$/
  static nationalCode: RegExp = /^[0-9]{10}$/
  static iranianPhoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null
      }
      const isValid = this.phoneNumber.test(this.normalizedValue(control.value))

      return isValid ? null : { pattern: true }
    }
  }
  static iranianPostalCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null
      }
      const isValid = this.postalCode.test(this.normalizedValue(control.value))

      return isValid ? null : { pattern: true }
    }
  }
  static iranianNationalCodeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null
      }
      const isValid = this.nationalCode.test(this.normalizedValue(control.value))

      return isValid ? null : { pattern: true }
    }
  }
  static normalizedValue(value) {
    return value?.replace(/[۰-۹]/g, (char: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(char).toString())?.replace(/[\s-]/g, '')
  }
  constructor(apiService: ApiService) {
    CustomValidators._api = apiService
  }

  static matchPasswords(AC: AbstractControl, passwordControlName: string, confirmPasswordControlName: string): void {
    let password: string = AC.get(passwordControlName).value
    let confirmPassword: string = AC.get(confirmPasswordControlName).value

    if (password != confirmPassword) AC.get(confirmPasswordControlName).setErrors({ match_error: true })
  }

  public domainCheck(control: FormControl): Observable<ValidationErrors | null> {
    let req: Observable<any> = <Observable<any>>CustomValidators._api.set('store/domain_check', 'POST', {
      body: { name: control.value }
    })
    return req.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      map((res: { status: string }) => {
        return res.status == 'valid' ? null : { invalidDomain: true }
      })
    )
    // TODO: Handle multi requests
    // return Promise.resolve({ error: true } || null)
    // return new Promise((resolve, reject) => {});
  }
}
