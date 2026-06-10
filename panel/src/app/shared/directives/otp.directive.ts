import { AfterViewInit, Directive, ElementRef } from '@angular/core'

@Directive({
  selector: '[otpMobileFix]'
})
export class OtpMobileFixDirective implements AfterViewInit {
  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    const inputs = this.el.nativeElement.querySelectorAll('input')

    inputs.forEach((input: HTMLInputElement, index: number) => {
      input.setAttribute('inputmode', 'numeric')
      input.setAttribute('pattern', '[0-9]*')
      input.setAttribute('autocomplete', 'one-time-code')

      input.addEventListener('input', () => {
        if (input.value && inputs[index + 1]) {
          inputs[index + 1].focus()
        }
      })
    })
  }
}
