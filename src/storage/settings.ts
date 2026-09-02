import type { PrivacySettings, PrivacySnapshot, SettingsListener } from '../shared/types'
import { STORAGE_KEY, SNAPSHOT_KEY } from '../shared/types'
import { DEFAULT_SETTINGS } from './defaults'

/**
 * All persistence lives behind this module so the rest of the extension never
 * touches chrome.storage directly. Uses `storage.local`: settings are small,
 * device-local is fine for a purely-visual preference, and it avoids the
 * signed-in-sync requirement / lower quota of `storage.sync`.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Merges stored settings onto the defaults so new fields added in later
 *  versions are filled in instead of leaving the settings object incomplete. */
function mergeWithDefaults<T>(defaults: T, stored: unknown): T {
  if (!isObject(stored)) return defaults
  const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) }
  for (const key of Object.keys(defaults as Record<string, unknown>)) {
    const defaultValue = (defaults as Record<string, unknown>)[key]
    const storedValue = (stored as Record<string, unknown>)[key]
    if (isObject(defaultValue) && storedValue !== undefined) {
      result[key] = mergeWithDefaults(defaultValue, storedValue)
    } else if (storedValue !== undefined) {
      result[key] = storedValue
    }
  }
  return result as T
}

export async function getSettings(): Promise<PrivacySettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  return mergeWithDefaults(DEFAULT_SETTINGS, stored[STORAGE_KEY])
}

export async function saveSettings(settings: PrivacySettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}

export async function updateSettings(
  updater: (current: PrivacySettings) => PrivacySettings,
): Promise<PrivacySettings> {
  const current = await getSettings()
  const next = updater(current)
  await saveSettings(next)
  return next
}

export async function resetSettings(): Promise<PrivacySettings> {
  await saveSettings(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function saveSnapshot(settings: PrivacySettings): Promise<void> {
  const snapshot: PrivacySnapshot = { settings, savedAt: Date.now() }
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: snapshot })
}

export async function getSnapshot(): Promise<PrivacySnapshot | null> {
  const stored = await chrome.storage.local.get(SNAPSHOT_KEY)
  return (stored[SNAPSHOT_KEY] as PrivacySnapshot | undefined) ?? null
}

export async function clearSnapshot(): Promise<void> {
  await chrome.storage.local.remove(SNAPSHOT_KEY)
}

/** Subscribes to live settings changes (e.g. popup edits reaching the content script). */
export function onSettingsChanged(listener: SettingsListener): () => void {
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: chrome.storage.AreaName,
  ) => {
    if (areaName !== 'local') return
    const change = changes[STORAGE_KEY]
    if (!change) return
    listener(mergeWithDefaults(DEFAULT_SETTINGS, change.newValue))
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}
