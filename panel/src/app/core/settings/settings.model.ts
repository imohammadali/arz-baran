import { AppState } from "../core.state";

export const NIGHT_MODE_THEME = "DARK-THEME";

export type Language = "en" | "fa";

export interface ICaptcha {
  captcha: string;
  id: string;
  type: string;
}

export interface SettingsState {
  language: string;
  theme: string;
  autoNightMode: boolean;
  nightTheme: string;
  stickyHeader: boolean;
  pageAnimations: boolean;
  pageAnimationsDisabled: boolean;
  elementsAnimations: boolean;
  hour: number;
  show_sidebar: boolean;
  show_mobile_sidebar: boolean;
  rtl: boolean;
  show_loading: boolean;
  captcha: ICaptcha;
  inProgressApi: string[];
  notifications: any[];
  isNotificationUnread: boolean;
}

export interface State extends AppState {
  settings: SettingsState;
}
