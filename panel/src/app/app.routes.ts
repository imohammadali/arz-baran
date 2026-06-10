import { Routes } from "@angular/router";
import { AuthGuardService } from "@core/auth/auth-guard.service";
import { AuthTemplateComponent } from "./_template/auth/auth-template.component";
import { ErrorTemplateComponent } from "./_template/error/error-template.component";
import { MainTemplateComponent } from "./_template/main/main-template.component";
export const routes: Routes = [
  {
    path: "",
    component: MainTemplateComponent,
    canLoad: [AuthGuardService],
    children: [
      {
        path: "",
        redirectTo: "/auth",
        pathMatch: "full",
      },
    ],
  },
  {
    path: "auth",
    component: AuthTemplateComponent,
    loadChildren: () =>
      import("@pages/auth/auth-routing").then((m) => m.routes),
    canActivateChild: [AuthGuardService],
    data: {
      title: "auth.sign_in",
    },
  },
  // {
  //   path: 'authorization',
  //   component: SimpleBackTemplateComponent,
  //   loadChildren: () => import('./pages/authorization/authorization.routing').then(m => m.routes),
  //   // canActivate: [AuthGuardService],
  //   data: {
  //     title: 'profile.authentication'
  //   }
  // },
  {
    path: "403",
    component: ErrorTemplateComponent,
  },
  {
    path: "404",
    component: ErrorTemplateComponent,
  },
  { path: "**", redirectTo: "404" },
];
