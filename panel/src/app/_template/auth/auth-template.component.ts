import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core'
import { RouterOutlet } from '@angular/router'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'auth-template',
  templateUrl: './auth-template.component.html',
  styleUrls: ['./auth-template.component.scss'],
  imports: [RouterOutlet]
})
export class AuthTemplateComponent implements OnInit, OnDestroy {
  ngOnDestroy(): void {}

  ngOnInit(): void {}
}
