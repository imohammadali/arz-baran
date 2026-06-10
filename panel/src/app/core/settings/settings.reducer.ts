import { SettingsState, NIGHT_MODE_THEME } from "./settings.model";
import {
  actionSettingsAddInProgressApi,
  actionSettingsChangeAnimationsElements,
  actionSettingsChangeAnimationsPage,
  actionSettingsChangeAnimationsPageDisabled,
  actionSettingsChangeAutoNightMode,
  actionSettingsChangeDirection,
  actionSettingsChangeHour,
  actionSettingsChangeLanguage,
  actionSettingsChangeMobileSidebar,
  actionSettingsChangeSidebar,
  actionSettingsChangeStickyHeader,
  actionSettingsChangeTheme,
  actionSettingsGenerateCaptcha,
  actionSettingsGeneratedCaptcha,
  actionSettingsLoading,
  actionSettingsRemoveInProgressApi,
  actionSettingsSetNotifications,
  actionSettingsSetBranches,
  actionSettingsSetBranch,
  actionSettingsSetNotificationUnread,
} from "./settings.actions";
import { Action, createReducer, on } from "@ngrx/store";

export const initialState: SettingsState = {
  language: "fa",
  theme: "default-theme",
  autoNightMode: false,
  nightTheme: NIGHT_MODE_THEME,
  stickyHeader: true,
  pageAnimations: true,
  pageAnimationsDisabled: false,
  elementsAnimations: true,
  hour: 0,
  show_sidebar: true,
  show_mobile_sidebar: false,
  rtl: true,
  show_loading: false,
  inProgressApi: [],
  notifications: [],
  captcha: {
    captcha: "",
    type: "",
    id: "",
  },
  isNotificationUnread: false,
};

const reducer = createReducer(
  initialState,
  on(
    actionSettingsChangeLanguage,
    actionSettingsChangeTheme,
    actionSettingsChangeAutoNightMode,
    actionSettingsChangeStickyHeader,
    actionSettingsChangeAnimationsPage,
    actionSettingsChangeAnimationsElements,
    actionSettingsChangeHour,
    actionSettingsChangeSidebar,
    actionSettingsChangeMobileSidebar,
    actionSettingsChangeDirection,
    actionSettingsLoading,
    actionSettingsSetNotifications,
    actionSettingsSetBranch,
    actionSettingsSetBranches,
    actionSettingsSetNotificationUnread,
    (state, action) => ({
      ...state,
      ...action,
    }),
  ),
  on(
    actionSettingsChangeAnimationsPageDisabled,
    (state, { pageAnimationsDisabled }) => ({
      ...state,
      pageAnimationsDisabled,
      pageAnimations: false,
    }),
  ),
  on(actionSettingsGenerateCaptcha, (state) => ({
    ...state,
  })),
  on(actionSettingsAddInProgressApi, (state, { apiKey }) => {
    let inProgressApi: string[] = [];
    if (!(state?.inProgressApi || [])?.find((key) => key == apiKey)) {
      inProgressApi = (state?.inProgressApi || []).concat(apiKey);
    }
    return {
      ...state,
      inProgressApi: inProgressApi,
    };
  }),
  on(actionSettingsRemoveInProgressApi, (state, { apiKey }) => {
    const inProgressApi: string[] = [...(state?.inProgressApi || [])].filter(
      (key) => key != apiKey,
    );
    return {
      ...state,
      inProgressApi: inProgressApi,
    };
  }),
  on(actionSettingsGeneratedCaptcha, (state, { data }) => ({
    ...state,
    captcha: {
      captcha: "data:image/png;base64," + data?.captcha,
      type: data?.type,
      id: data?.id,
    },
  })),
);

export function settingsReducer(
  state: SettingsState | undefined,
  action: Action,
) {
  return reducer(state, action);
}
