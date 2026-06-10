import { Directive, HostListener } from '@angular/core'
import { NgControl } from '@angular/forms'

@Directive({
  selector: '[numbersOnly]'
})
export class NumbersOnlyDirective {
  constructor(private ngControl: NgControl) {}

  private convertToEnglish(value: string): string {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

    return value
      .split('')
      .map(char => {
        const persianIndex = persianNumbers.indexOf(char)
        if (persianIndex !== -1) return englishNumbers[persianIndex]

        const arabicIndex = arabicNumbers.indexOf(char)
        if (arabicIndex !== -1) return englishNumbers[arabicIndex]

        return char
      })
      .join('')
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    const numericValue = this.convertToEnglish(value).replace(/[^0-9]/g, '')
    this.ngControl.control?.setValue(numericValue, { emitEvent: false })
  }
}
