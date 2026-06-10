import { Injectable} from '@angular/core';
import { select, Store } from '@ngrx/store';
import { BreadcrumbActions } from '@shared/components/breadcrumb/+state/breadcrumb.actions';
import {BreadcrumbInitialState, BreadcrumbPartialState} from '@shared/components/breadcrumb/+state/breadcrumb.entity';
import { BreadcrumbSelectors } from '@shared/components/breadcrumb/+state/breadcrumb.selectors';
import {take} from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class BreadcrumbFacade {

  state$ = this.store.pipe(select(BreadcrumbSelectors.state));
  data$ = this.store.pipe(select(BreadcrumbSelectors.data));
  show$ = this.store.pipe(select(BreadcrumbSelectors.show));

  constructor(private store: Store<BreadcrumbPartialState>) { }

  setData(data: string) {
    this.store.dispatch(BreadcrumbActions.setData({data: data}));
  }

  touchData() {
    let rnd_number = Math.floor(Math.random()*(999-100+1)+100);
    this.store.dispatch(BreadcrumbActions.touch({randomNumber: rnd_number}));
  }

  show() {
    this.store.dispatch(BreadcrumbActions.show({ show: true }));
  }

  hide() {
    this.store.dispatch(BreadcrumbActions.show({ show: false }));
  }

}
