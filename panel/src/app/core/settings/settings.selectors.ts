import { createSelector } from "@ngrx/store";

import { SettingsState } from "./settings.model";
import { selectSettingsState } from "../core.state";

export const selectSettings = createSelector(
  selectSettingsState,
  (state: SettingsState) => state,
);

export const selectSettingsStickyHeader = createSelector(
  selectSettings,
  (state: SettingsState) => state.stickyHeader,
);

export const selectSettingsNotification = createSelector(
  selectSettings,
  (state: SettingsState) => state.notifications,
);

export const selectSettingsInProgressApi = createSelector(
  selectSettings,
  (state: SettingsState) => state.inProgressApi,
);

export const selectSettingsLanguage = createSelector(
  selectSettings,
  (state: SettingsState) => state.language,
);

export const selectSettingsLoading = createSelector(
  selectSettings,
  (state: SettingsState) => state.show_loading,
);

export const selectTheme = createSelector(
  selectSettings,
  (settings) => settings.theme,
);

export const selectPageAnimations = createSelector(
  selectSettings,
  (settings) => settings.pageAnimations,
);

export const selectElementsAnimations = createSelector(
  selectSettings,
  (settings) => settings.elementsAnimations,
);

export const selectAutoNightMode = createSelector(
  selectSettings,
  (settings) => settings.autoNightMode,
);

export const selectNightTheme = createSelector(
  selectSettings,
  (settings) => settings.nightTheme,
);

export const selectHour = createSelector(
  selectSettings,
  (settings) => settings.hour,
);

export const selectIsNightHour = createSelector(
  selectAutoNightMode,
  selectHour,
  (autoNightMode, hour) => autoNightMode && (hour >= 21 || hour <= 7),
);

export const selectEffectiveTheme = createSelector(
  selectTheme,
  selectNightTheme,
  selectIsNightHour,
  (theme, nightTheme, isNightHour) =>
    (isNightHour ? nightTheme : theme).toLowerCase(),
);

export const selectSidebar = createSelector(
  selectSettings,
  (settings) => settings.show_sidebar,
);

export const selectMobileSidebar = createSelector(
  selectSettings,
  (settings) => settings.show_mobile_sidebar,
);

export const selectRtlDirection = createSelector(
  selectSettings,
  (settings) => settings.rtl,
);

export const selectCaptcha = createSelector(
  selectSettings,
  (state: SettingsState) => state.captcha,
);
export const selectNotificationUnread = createSelector(
  selectSettings,
  (state: SettingsState) => state.isNotificationUnread,
);
