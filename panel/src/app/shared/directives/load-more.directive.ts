import { Directive, DOCUMENT, ElementRef, EventEmitter, HostListener, Inject, Input, Output } from '@angular/core'

@Directive({
  selector: '[load-more]'
})
export class LoadMoreDirective {
  @Input() element: string = null
  @Input() appendTo: string = null
  @Output() loadMore = new EventEmitter()

  @HostListener('click', ['$event'])
  onScroll(event) {
    setTimeout(_ => {
      let el: HTMLDivElement = null
      switch (this.element) {
        case 'treeSelect': {
          el =
            this._hostElement.nativeElement.getElementsByClassName('p-treeselect-items-wrapper')?.[0] ??
            this.document.body.getElementsByClassName('p-treeselect-items-wrapper')?.item(0)
          break
        }
        case 'autoComplete': {
          el =
            this._hostElement.nativeElement.getElementsByClassName('p-autocomplete-panel')?.[0] ??
            this.document.body.getElementsByClassName('p-autocomplete-panel')?.item(0)
          break
        }
        case 'dropdown': {
          el =
            this._hostElement.nativeElement.getElementsByClassName('p-dropdown-items-wrapper')?.[0] ??
            this.document.body.getElementsByClassName('p-dropdown-items-wrapper')?.item(0)
          break
        }
        case 'select': {
          el =
            this._hostElement.nativeElement.getElementsByClassName('p-select-list-container')?.[0] ??
            this.document.body.getElementsByClassName('p-select-list-container')?.item(0)
          break
        }
        case 'multiselect': {
          el =
            this._hostElement.nativeElement.getElementsByClassName('p-multiselect-list-container')?.[0] ??
            this.document.body.getElementsByClassName('p-multiselect-list-container')?.item(0)
          break
        }
      }
      if (el !== null && el !== undefined) {
        el.onscroll = () => {
          if (el.scrollTop + el.clientHeight + 100 > el.scrollHeight) {
            this.loadMore.emit()
          }
        }
      }
    }, 100)
  }

  constructor(
    private _hostElement: ElementRef,
    @Inject(DOCUMENT) private document: Document
  ) {}
}
