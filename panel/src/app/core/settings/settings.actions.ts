import { createAction, props } from '@ngrx/store'

import { Language } from './settings.model'

export const actionSettingsGenerateCaptcha = createAction('[Settings] Generate Captcha', props<{ size: { w: string; h: string } }>())

export const actionSettingsAddInProgressApi = createAction('[Settings] add inproress api', props<{ apiKey: string }>())

export const actionSettingsRemoveInProgressApi = createAction('[Settings] remove inproress api', props<{ apiKey: string }>())

export const actionSettingsGeneratedCaptcha = createAction('[Settings] Generated Captcha', props<{ data }>())

export const actionSettingsSetNotifications = createAction('[Settings] set Notification', props<{ notifications }>())

export const actionSettingsChangeLanguage = createAction('[Settings] Change Language', props<{ language: Language }>())

export const actionSettingsChangeTheme = createAction('[Settings] Change Theme', props<{ theme: string }>())
export const actionSettingsChangeAutoNightMode = createAction('[Settings] Change Auto Night Mode', props<{ autoNightMode: boolean }>())

export const actionSettingsChangeStickyHeader = createAction('[Settings] Change Sticky Header', props<{ stickyHeader: boolean }>())

export const actionSettingsChangeAnimationsPage = createAction('[Settings] Change Animations Page', props<{ pageAnimations: boolean }>())

export const actionSettingsChangeAnimationsPageDisabled = createAction('[Settings] Change Animations Page Disabled', props<{ pageAnimationsDisabled: boolean }>())

export const actionSettingsChangeAnimationsElements = createAction('[Settings] Change Animations Elements', props<{ elementsAnimations: boolean }>())
export const actionSettingsChangeHour = createAction('[Settings] Change Hours', props<{ hour: number }>())

export const actionSettingsChangeSidebar = createAction('[Settings] Change Sidebar', props<{ show_sidebar: boolean }>())

export const actionSettingsChangeMobileSidebar = createAction('[Settings] Change Mobile Sidebar', props<{ show_mobile_sidebar: boolean }>())

export const actionSettingsChangeDirection = createAction('[Settings] Change Direction Theme', props<{ rtl: boolean }>())

export const actionSettingsLoading = createAction('[Settings] Loading', props<{ show_loading: boolean }>())
export const actionSettingsSetBranch = createAction('[Settings] Set Branch', props<{ branch: object }>())
export const actionSettingsSetBranches = createAction('[Settings] Set Branches', props<{ branches: any[] }>())
export const actionSettingsSetNotificationUnread = createAction('[Settings] Set Notification Unread', props<{ isNotificationUnread: boolean }>())
