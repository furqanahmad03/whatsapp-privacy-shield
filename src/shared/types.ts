/**
 * Central settings model for WhatsApp Privacy Shield.
 * This is the single source of truth for what the extension can control.
 */

export type PrivacyStyle =
  | 'blur'
  | 'strong-blur'
  | 'frosted'
  | 'pixelated'
  | 'block'
  | 'dim'
  | 'hidden'

export type OverlayShape = 'rounded' | 'flat'

export interface SidebarSettings {
  /** Blur every part of the sidebar in one go. */
  blurAll: boolean
  /** Collapse the sidebar out of the layout entirely. */
  hidden: boolean
  names: boolean
  avatars: boolean
  messagePreviews: boolean
  timestamps: boolean
  unreadCounters: boolean
  searchResults: boolean
  /** Never blur the row for the chat that's currently open. */
  keepActiveChatVisible: boolean
}

export interface HeaderSettings {
  /** Blur every part of the opened chat's header in one go. */
  blurAll: boolean
  name: boolean
  avatar: boolean
  /** Online / last seen / "typing…" status line. */
  status: boolean
  /** Group participant list / subtitle line. */
  subtitle: boolean
}

export interface AppearanceSettings {
  style: PrivacyStyle
  /** Blur radius in px, used by the blur-based styles. Range 2–30. */
  blurStrength: number
  overlayShape: OverlayShape
}

export interface FloatingControlSettings {
  enabled: boolean
}

export interface PrivacySettings {
  /** Master switch. When off, WhatsApp renders normally regardless of the rest. */
  enabled: boolean
  sidebar: SidebarSettings
  header: HeaderSettings
  appearance: AppearanceSettings
  floatingControl: FloatingControlSettings
}

/** Snapshot saved by the "Blur Everything" panic button so it can be undone. */
export interface PrivacySnapshot {
  settings: PrivacySettings
  savedAt: number
}

export const STORAGE_KEY = 'wa-privacy-settings'
export const SNAPSHOT_KEY = 'wa-privacy-snapshot'

export type SettingsListener = (settings: PrivacySettings) => void
