import { EventEmitter, Injectable, Output , ChangeDetectionStrategy} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaService {

  // @Output() promptEvent: EventEmitter<any> = new EventEmitter();

  // private promptEvent: any;

  constructor(
    swUpdate: SwUpdate
  ) {

    swUpdate.available.subscribe(event => {
      //console.log('current version: ', event.current);
      //console.log('available version: ', event.available);
      //console.log('type: ', event.type);
    });

    swUpdate.activated.subscribe(event => {
      //console.log('old version: ', event.previous);
      //console.log('new version: ', event.current);
      this.reload();
    });
  }

  // public initPwaPrompt() {
  //   window.addEventListener('beforeinstallprompt', (event: any) => {
  //     event.preventDefault();
  //     this.promptEvent = event;
  //     // this.openPromptComponent('android');
  //   });
  // }

  public reload() {
    window.location.reload();
  }

  // private openPromptComponent(mobileType: 'ios' | 'android') {
  //   timer(3000)
  //     .pipe(take(1))
  //     .subscribe(() => this.bottomSheet.open(PromptComponent, { data: { mobileType, promptEvent: this.promptEvent } }));
  // }
}
