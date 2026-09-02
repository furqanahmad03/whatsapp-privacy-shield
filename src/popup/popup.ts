import type { PrivacySettings, PrivacyStyle, OverlayShape } from '../shared/types'
import { getSettings, updateSettings, resetSettings, onSettingsChanged, getSnapshot, saveSnapshot, clearSnapshot } from '../storage/settings'
import { panicSettings } from '../storage/defaults'

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`popup: missing #${id}`)
  return el as T
}

const el = {
  masterEnabled: $<HTMLInputElement>('master-enabled'),

  sidebarBlurAll: $<HTMLInputElement>('sidebar-blur-all'),
  sidebarHidden: $<HTMLInputElement>('sidebar-hidden'),
  blurEverything: $<HTMLButtonElement>('blur-everything'),
  restoreSnapshot: $<HTMLButtonElement>('restore-snapshot'),

  sidebarNames: $<HTMLInputElement>('sidebar-names'),
  sidebarAvatars: $<HTMLInputElement>('sidebar-avatars'),
  sidebarPreviews: $<HTMLInputElement>('sidebar-previews'),
  sidebarKeepActive: $<HTMLInputElement>('sidebar-keep-active'),

  headerBlurAll: $<HTMLInputElement>('header-blur-all'),
  headerIndividual: $<HTMLDivElement>('header-individual-controls'),
  headerName: $<HTMLInputElement>('header-name'),
  headerAvatar: $<HTMLInputElement>('header-avatar'),
  headerStatus: $<HTMLInputElement>('header-status'),
  headerSubtitle: $<HTMLInputElement>('header-subtitle'),

  styleOptions: $<HTMLDivElement>('style-options'),

  strengthCard: $<HTMLDivElement>('strength-card'),
  strengthValue: $<HTMLSpanElement>('strength-value'),
  blurStrength: $<HTMLInputElement>('blur-strength'),

  sidebarTimestamps: $<HTMLInputElement>('sidebar-timestamps'),
  sidebarUnread: $<HTMLInputElement>('sidebar-unread'),
  sidebarSearch: $<HTMLInputElement>('sidebar-search'),
  overlayShape: $<HTMLDivElement>('overlay-shape'),
  floatingToggleEnabled: $<HTMLInputElement>('floating-toggle-enabled'),

  resetSettings: $<HTMLButtonElement>('reset-settings'),
  resetConfirm: $<HTMLDivElement>('reset-confirm'),
  resetCancel: $<HTMLButtonElement>('reset-cancel'),
  resetConfirmYes: $<HTMLButtonElement>('reset-confirm-yes'),
}

const STYLES_WITH_STRENGTH: PrivacyStyle[] = ['blur', 'strong-blur', 'frosted', 'pixelated']

function render(settings: PrivacySettings): void {
  el.masterEnabled.checked = settings.enabled

  el.sidebarBlurAll.checked = settings.sidebar.blurAll
  el.sidebarHidden.checked = settings.sidebar.hidden

  el.sidebarNames.checked = settings.sidebar.blurAll || settings.sidebar.names
  el.sidebarAvatars.checked = settings.sidebar.blurAll || settings.sidebar.avatars
  el.sidebarPreviews.checked = settings.sidebar.blurAll || settings.sidebar.messagePreviews
  el.sidebarNames.disabled = settings.sidebar.blurAll
  el.sidebarAvatars.disabled = settings.sidebar.blurAll
  el.sidebarPreviews.disabled = settings.sidebar.blurAll
  el.sidebarKeepActive.checked = settings.sidebar.keepActiveChatVisible

  el.headerBlurAll.checked = settings.header.blurAll
  el.headerName.checked = settings.header.blurAll || settings.header.name
  el.headerAvatar.checked = settings.header.blurAll || settings.header.avatar
  el.headerStatus.checked = settings.header.blurAll || settings.header.status
  el.headerSubtitle.checked = settings.header.blurAll || settings.header.subtitle
  ;[el.headerName, el.headerAvatar, el.headerStatus, el.headerSubtitle].forEach((input) => {
    input.disabled = settings.header.blurAll
  })
  el.headerIndividual.classList.toggle('disabled', settings.header.blurAll)

  el.styleOptions
    .querySelectorAll<HTMLInputElement>('input[name="style"]')
    .forEach((input) => (input.checked = input.value === settings.appearance.style))

  el.blurStrength.value = String(settings.appearance.blurStrength)
  el.strengthValue.textContent = `${settings.appearance.blurStrength}px`
  el.strengthCard.classList.toggle('inactive', !STYLES_WITH_STRENGTH.includes(settings.appearance.style))

  el.sidebarTimestamps.checked = settings.sidebar.blurAll || settings.sidebar.timestamps
  el.sidebarUnread.checked = settings.sidebar.blurAll || settings.sidebar.unreadCounters
  el.sidebarSearch.checked = settings.sidebar.blurAll || settings.sidebar.searchResults
  el.sidebarTimestamps.disabled = settings.sidebar.blurAll
  el.sidebarUnread.disabled = settings.sidebar.blurAll
  el.sidebarSearch.disabled = settings.sidebar.blurAll

  el.overlayShape.querySelectorAll<HTMLButtonElement>('.segment').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === settings.appearance.overlayShape)
  })

  el.floatingToggleEnabled.checked = settings.floatingControl.enabled
}

async function refreshRestoreButton(): Promise<void> {
  const snapshot = await getSnapshot()
  el.restoreSnapshot.disabled = !snapshot
}

function on(input: HTMLInputElement, mutate: (settings: PrivacySettings, checked: boolean) => PrivacySettings): void {
  input.addEventListener('change', () => {
    void updateSettings((current) => mutate(current, input.checked))
  })
}

on(el.masterEnabled, (s, checked) => ({ ...s, enabled: checked }))
on(el.sidebarBlurAll, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, blurAll: checked } }))
on(el.sidebarHidden, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, hidden: checked } }))
on(el.sidebarNames, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, names: checked } }))
on(el.sidebarAvatars, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, avatars: checked } }))
on(el.sidebarPreviews, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, messagePreviews: checked } }))
on(el.sidebarKeepActive, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, keepActiveChatVisible: checked } }))

on(el.headerBlurAll, (s, checked) => ({ ...s, header: { ...s.header, blurAll: checked } }))
on(el.headerName, (s, checked) => ({ ...s, header: { ...s.header, name: checked } }))
on(el.headerAvatar, (s, checked) => ({ ...s, header: { ...s.header, avatar: checked } }))
on(el.headerStatus, (s, checked) => ({ ...s, header: { ...s.header, status: checked } }))
on(el.headerSubtitle, (s, checked) => ({ ...s, header: { ...s.header, subtitle: checked } }))

on(el.sidebarTimestamps, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, timestamps: checked } }))
on(el.sidebarUnread, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, unreadCounters: checked } }))
on(el.sidebarSearch, (s, checked) => ({ ...s, sidebar: { ...s.sidebar, searchResults: checked } }))
on(el.floatingToggleEnabled, (s, checked) => ({ ...s, floatingControl: { enabled: checked } }))

el.styleOptions.querySelectorAll<HTMLInputElement>('input[name="style"]').forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return
    void updateSettings((current) => ({
      ...current,
      appearance: { ...current.appearance, style: input.value as PrivacyStyle },
    }))
  })
})

el.blurStrength.addEventListener('input', () => {
  el.strengthValue.textContent = `${el.blurStrength.value}px`
  void updateSettings((current) => ({
    ...current,
    appearance: { ...current.appearance, blurStrength: Number(el.blurStrength.value) },
  }))
})

el.overlayShape.querySelectorAll<HTMLButtonElement>('.segment').forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = btn.dataset.value as OverlayShape
    void updateSettings((current) => ({
      ...current,
      appearance: { ...current.appearance, overlayShape: value },
    }))
  })
})

el.blurEverything.addEventListener('click', async () => {
  const current = await getSettings()
  await saveSnapshot(current)
  await updateSettings((s) => panicSettings(s))
  await refreshRestoreButton()
})

el.restoreSnapshot.addEventListener('click', async () => {
  const snapshot = await getSnapshot()
  if (!snapshot) return
  await updateSettings(() => snapshot.settings)
  await clearSnapshot()
  await refreshRestoreButton()
})

el.resetSettings.addEventListener('click', () => {
  el.resetConfirm.classList.remove('hidden')
})
el.resetCancel.addEventListener('click', () => {
  el.resetConfirm.classList.add('hidden')
})
el.resetConfirmYes.addEventListener('click', async () => {
  await resetSettings()
  el.resetConfirm.classList.add('hidden')
})

async function init(): Promise<void> {
  render(await getSettings())
  await refreshRestoreButton()
  onSettingsChanged((settings) => render(settings))
}

void init()
