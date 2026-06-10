import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GenerateTitleService {

  constructor() { }
  generateRequestTitle(nodeName?:string,service_type?:string,subcategory?:string):string{
    let type = ""
    switch (service_type){
      case "VPNPLUS":
        type = "VPN+"
        break;
      case "VPN Lite":
        type = "Lite"
        break;
      case "APN":
        type = "APN"
        break;
      default:
        type = service_type
    }
    return nodeName ? `EMP:${type}/${subcategory}/${nodeName}`:`EMP:${type}/${subcategory}`
  }
}
