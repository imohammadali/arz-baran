import {Directive, ElementRef, Input, OnDestroy, OnInit, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import {select, Store} from "@ngrx/store";
import {AppState} from "@core/core.state";
import {selectSettingsInProgressApi} from "@core/settings/settings.selectors";
import {Subject, takeUntil} from "rxjs";

@Directive({
  selector: '[loading]'
})
export class LoadingDirective implements OnInit, OnDestroy {

  @Input() apiKey;
  inProgressApi$ = this._store.pipe(select(selectSettingsInProgressApi));
  destroy$ = new Subject()
  constructor(
    private _store: Store<AppState>,
    private _templateRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.inProgressApi$.pipe(takeUntil(this.destroy$)).subscribe(keys => {
      let template = this._templateRef.nativeElement as HTMLElement
      if (!this.apiKey) return
      if (keys?.includes(this.apiKey)) {
        template?.classList?.add('loading')
      } else {
        template?.classList?.remove('loading')
      }
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }



}
