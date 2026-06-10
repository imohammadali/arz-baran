import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'currencySeparator'
})
export class CurrencySeparatorPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return ''
    }
    return value.toLocaleString('fa-IR')
  }
}
