import type { PrivacySettings } from '../shared/types'

export const DEFAULT_SETTINGS: PrivacySettings = {
  enabled: true,
  sidebar: {
    blurAll: false,
    hidden: false,
    names: true,
    avatars: true,
    messagePreviews: true,
    timestamps: false,
    unreadCounters: false,
    searchResults: true,
    keepActiveChatVisible: true,
  },
  header: {
    blurAll: false,
    name: true,
    avatar: true,
    status: false,
    subtitle: false,
  },
  appearance: {
    style: 'blur',
    blurStrength: 8,
    overlayShape: 'rounded',
  },
  floatingControl: {
    enabled: true,
  },
}

export const BLUR_STRENGTH_MIN = 2
export const BLUR_STRENGTH_MAX = 30

/** Applied by the "Blur Everything" panic button — maximum coverage, kept style/strength as-is. */
export function panicSettings(base: PrivacySettings): PrivacySettings {
  return {
    ...base,
    enabled: true,
    sidebar: {
      ...base.sidebar,
      blurAll: true,
      hidden: false,
      names: true,
      avatars: true,
      messagePreviews: true,
      timestamps: true,
      unreadCounters: true,
      searchResults: true,
    },
    header: {
      ...base.header,
      blurAll: true,
      name: true,
      avatar: true,
      status: true,
      subtitle: true,
    },
  }
}
