// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
declare var require: any;
const packageJson = require("../../package.json");

export const environment = {
  appName: "پنل ادمین",
  envName: "DEV",
  production: false,
  test: false,
  i18nPrefix: "",
  baseUrlTicketingFiles:
    "http://localhost:4200/api/ticketing/v1/file/serve?filename=",
  baseApiUrl: "http://localhost:4200/admin/",
  baseWebsocketUrl: "ws://",
  assetURL: "/assets/",
  refreshTokenMinute: 7,
  signature_callcenter_password: "jksle1@jffflksl3dsdjbFD$R@#DDCsd",
  versions: {
    app: packageJson.version,
    build: packageJson.build,
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
