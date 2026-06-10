import { bootstrapApplication } from '@angular/platform-browser'
import { appConfig } from './app/app.config'
import { AppComponent } from './app/app.component'
import { register } from 'swiper/element/bundle'
import { environment } from '@env/environment'

const assetsUrl = environment.assetURL

// add to header
const favicon = document.createElement('link')
favicon.id = 'app-favicon'
favicon.rel = 'shortcut icon'
favicon.href = assetsUrl + 'img/favicon.svg'
document.head.appendChild(favicon)

// set loader logo from favicon
const loaderLogo = document.getElementById('app-loader-logo') as HTMLElement
if (loaderLogo) {
  loaderLogo.style.backgroundImage = `url(${favicon.href})`
}

// if (environment.production) {
//   enableProdMode();
if (window) {
  console.info(`Version: ${environment.versions.app}, Build Number: ${environment.versions.build}`)
}

register()
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err))
