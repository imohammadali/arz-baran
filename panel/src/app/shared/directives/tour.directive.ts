import { AfterViewInit, Directive, ElementRef, Injector, Input, Renderer2 } from '@angular/core'
import { Utility } from '@shared/services/utility'

@Directive({
  selector: '[tour]'
})
export class TourDirective extends Utility implements AfterViewInit {
  tourLink = document.createElement('span')
  page = ''
  selected_tour = null

  @Input('data-id') id

  constructor(
    public renderer: Renderer2,
    public hostElement: ElementRef,
    injector: Injector
  ) {
    super(injector)
  }

  ngAfterViewInit(): void {
    this.renderer.listen(this.hostElement.nativeElement, 'mouseover', () => {
      let tours = this.storageService.getItem('tours') || []
      if (!tours) return
      this.selected_tour = tours?.find(tour => tour?.page?.name == this.page)
      if (this.selected_tour?.special_status == 'IGNORED') return
      this.renderer.removeClass(this.tourLink, 'd-none')
    })
    this.renderer.listen(this.hostElement.nativeElement, 'mouseout', () => {
      this.renderer.addClass(this.tourLink, 'd-none')
    })

    this.page = document.querySelectorAll('[page-name]').item(0)?.getAttribute('page-name') || ''
    let stepData = this.getTourByPageName()
    if (stepData) {
      ;[
        { attrKey: 'data-intro', attrValue: 'description' },
        { attrKey: 'data-step', attrValue: 'step' },
        { attrKey: 'data-title', attrValue: 'title' }
      ].forEach(attr => {
        this.renderer.setAttribute(this.hostElement.nativeElement, attr['attrKey'], stepData[attr['attrValue']])
      })
      this.renderer.setStyle(this.hostElement.nativeElement, 'position', 'relative')
      let tours = this.storageService.getItem('tours') || []
      if (!tours) return
      this.selected_tour = tours?.find(tour => tour?.page?.name == this.page)

      if (this.selected_tour?.status == 'ACTIVE' && this.selected_tour?.special_status !== 'IGNORED') {
        this.addEl()
      }
    }
  }

  addEl() {
    this.tourLink.style.position = 'absolute'
    this.tourLink.style.insetBlockStart = '0'
    this.tourLink.style.insetInlineEnd = '0'
    this.tourLink.style.cursor = 'pointer'
    this.tourLink.style.backgroundColor = 'var(--color-surface-50)'
    this.tourLink.style.color = 'var(--text-primary-color)'
    this.tourLink.style.fontSize = '.9rem'
    this.tourLink.style.padding = '.15rem'
    this.tourLink.style.borderRadius = '.2rem'
    this.tourLink.classList.add('pi', 'pi-question-circle', 'tour-help', 'd-none')
    this.renderer.appendChild(this.hostElement.nativeElement, this.tourLink)
    this.renderer.listen(this.tourLink, 'click', () => {
      this.tourInit(
        {
          showProgress: false,
          showStepNumbers: false,
          showBullets: false,
          dontShowAgain: true,
          dontShowAgainLabel: this.translate.instant('management.tours.dont_show'),
          dontShowAgainCookie: this.page + '_dont_show',
          steps: [
            {
              element: this.hostElement.nativeElement,
              title: (<HTMLElement>this.hostElement.nativeElement).getAttribute('data-title') || '',
              intro: (<HTMLElement>this.hostElement.nativeElement).getAttribute('data-intro') || ''
            }
          ]
        },
        0,
        false,
        true
      )
    })
  }

  get allTours(): any[] {
    return this.storageService.getItem('tours') || []
  }

  getTourByPageName() {
    return (this.allTours?.find(tour => tour?.page?.name === this.page)?.steps || []).find(item => item.key == this.id)
  }
}
