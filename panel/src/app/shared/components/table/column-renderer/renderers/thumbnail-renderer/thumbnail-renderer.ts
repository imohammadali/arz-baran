import {ChangeDetectionStrategy, Component, Input, OnInit} from "@angular/core";
import {AvatarModule} from "primeng/avatar";
import {BehaviorSubject} from "rxjs";
import {AsyncPipe} from "@angular/common";
import {environment} from "@env/environment";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'thumbnail-renderer',
  standalone: true,
  imports: [
    AvatarModule,
  ],
  template: `
    <p-avatar [image]="imageSrc" size="large" shape="circle" (onImageError)="updateLink(assetUrl+'img/thumbnail.png')"></p-avatar>
  `
})
export class ThumbnailRenderer implements OnInit {

  @Input() data = null;
  assetUrl = environment.assetURL
  imageSrc = null

  constructor(private readonly sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateLink(this.data)
  }

  updateLink(link: string) {
    this.imageSrc = this.sanitizer.bypassSecurityTrustUrl(link) ;
  }

}
