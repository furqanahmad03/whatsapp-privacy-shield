import { getSettings, saveSettings, saveSnapshot } from '../storage/settings'
import { panicSettings } from '../storage/defaults'

/**
 * The background service worker only mediates the two optional keyboard
 * shortcuts. It reads/writes chrome.storage directly — the content script
 * picks up the change via storage.onChanged, so no runtime messaging is
 * needed between the two.
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-privacy-mode') {
    const current = await getSettings()
    await saveSettings({ ...current, enabled: !current.enabled })
    return
  }

  if (command === 'blur-everything') {
    const current = await getSettings()
    await saveSnapshot(current)
    await saveSettings(panicSettings(current))
  }
})
