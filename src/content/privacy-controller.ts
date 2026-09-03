import type { PrivacySettings } from '../shared/types'
import { SELECTORS, cssAny } from './selectors'
import { generatePrivacyStylesheet } from './style-generator'
import { debouncedObserver } from './observer'
import { getSettings, updateSettings, onSettingsChanged } from '../storage/settings'

const STYLE_TAG_ID = 'wa-privacy-dynamic-styles'
const ROOT = document.documentElement

const ALL_STYLE_CLASSES = [
  'wa-privacy-style-blur',
  'wa-privacy-style-strong-blur',
  'wa-privacy-style-frosted',
  'wa-privacy-style-pixelated',
  'wa-privacy-style-block',
  'wa-privacy-style-dim',
  'wa-privacy-style-hidden',
]

const OVERLAY_RADIUS: Record<PrivacySettings['appearance']['overlayShape'], string> = {
  rounded: '10px',
  flat: '2px',
}

/** Injects the generated WhatsApp-selector stylesheet once. Never re-injected. */
function injectStylesheet(): void {
  if (document.getElementById(STYLE_TAG_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_TAG_ID
  style.textContent = generatePrivacyStylesheet()
  document.head.appendChild(style)
}

/** Merges each group's `blurAll`/complete-header flag into its members. */
function effectiveFlags(settings: PrivacySettings) {
  const s = settings.sidebar
  const h = settings.header
  return {
    sidebar: {
      names: s.blurAll || s.names,
      avatars: s.blurAll || s.avatars,
      messagePreviews: s.blurAll || s.messagePreviews,
      timestamps: s.blurAll || s.timestamps,
      unreadCounters: s.blurAll || s.unreadCounters,
      searchResults: s.blurAll || s.searchResults,
    },
    header: {
      name: h.blurAll || h.name,
      avatar: h.blurAll || h.avatar,
      status: h.blurAll || h.status,
      subtitle: h.blurAll || h.subtitle,
    },
  }
}

function setClass(className: string, on: boolean): void {
  ROOT.classList.toggle(className, on)
}

function applyRootClasses(settings: PrivacySettings): void {
  setClass('wa-privacy-enabled', settings.enabled)
  setClass('wa-privacy-sidebar-hidden', settings.enabled && settings.sidebar.hidden)

  for (const styleClass of ALL_STYLE_CLASSES) setClass(styleClass, false)
  setClass(`wa-privacy-style-${settings.appearance.style}`, true)

  const flags = effectiveFlags(settings)
  setClass('wa-privacy-sidebar-names', flags.sidebar.names)
  setClass('wa-privacy-sidebar-avatars', flags.sidebar.avatars)
  setClass('wa-privacy-sidebar-previews', flags.sidebar.messagePreviews)
  setClass('wa-privacy-sidebar-timestamps', flags.sidebar.timestamps)
  setClass('wa-privacy-sidebar-unread', flags.sidebar.unreadCounters)
  setClass('wa-privacy-sidebar-searchresults', flags.sidebar.searchResults)

  setClass('wa-privacy-header-name', flags.header.name)
  setClass('wa-privacy-header-avatar', flags.header.avatar)
  setClass('wa-privacy-header-status', flags.header.status)
  setClass('wa-privacy-header-subtitle', flags.header.subtitle)
}

function applyCssVariables(settings: PrivacySettings): void {
  ROOT.style.setProperty('--wa-privacy-blur-strength', `${settings.appearance.blurStrength}px`)
  ROOT.style.setProperty('--wa-privacy-radius', OVERLAY_RADIUS[settings.appearance.overlayShape])
}

// ---------------------------------------------------------------------------
// "Keep active chat visible": tag the currently-open row via a delegated
// click listener (cheap — one listener, no polling) instead of trying to
// infer selection state from WhatsApp's own markup, which isn't consistently
// exposed. The row-level CSS generated in style-generator.ts skips whatever
// carries this marker.
// ---------------------------------------------------------------------------

let activeChatTrackingEnabled = false
const delegatedContainers = new WeakSet<Element>()

function clearActiveMarker(): void {
  document
    .querySelectorAll(`[${SELECTORS.sidebar.activeRowMarker}]`)
    .forEach((el) => el.removeAttribute(SELECTORS.sidebar.activeRowMarker))
}

function handleSidebarClick(event: Event): void {
  if (!activeChatTrackingEnabled) return
  const target = event.target as Element | null
  const row = target?.closest(cssAny(SELECTORS.sidebar.row))
  if (!row) return
  clearActiveMarker()
  row.setAttribute(SELECTORS.sidebar.activeRowMarker, 'true')

  // A data-testid row may be nested inside an ARIA row. Mark both so the
  // generated fallback selectors cannot blur the active chat through its
  // unmarked outer wrapper.
  const container = target?.closest(cssAny(SELECTORS.sidebar.container))
  let ancestor = row.parentElement?.closest(cssAny(SELECTORS.sidebar.row))
  while (ancestor && container?.contains(ancestor)) {
    ancestor.setAttribute(SELECTORS.sidebar.activeRowMarker, 'true')
    ancestor = ancestor.parentElement?.closest(cssAny(SELECTORS.sidebar.row)) ?? null
  }
}

function bindSidebarClickDelegation(): void {
  document.querySelectorAll(cssAny(SELECTORS.sidebar.container)).forEach((container) => {
    if (delegatedContainers.has(container)) return
    delegatedContainers.add(container)
    container.addEventListener('click', handleSidebarClick, { capture: true })
  })
}

/** Tags the timestamp in each visible chat row. WhatsApp does not expose a
 * stable attribute for it in every rollout, so identify it by its consistent
 * position within the already-scoped sidebar row. */
function tagSidebarTargets(): void {
  document.querySelectorAll(cssAny(SELECTORS.sidebar.container)).forEach((container) => {
    container.querySelectorAll(cssAny(SELECTORS.sidebar.row)).forEach((row) => {
      const rowRect = row.getBoundingClientRect()
      if (rowRect.width <= 2 || rowRect.height <= 2) return

      const name = row.querySelector(cssAny(SELECTORS.sidebar.name))
      if (!name) return
      const nameRect = name.getBoundingClientRect()
      const timestamp = Array.from(row.querySelectorAll<HTMLElement>('span:not(:has(*)), time'))
        .filter((candidate) => {
          const rect = candidate.getBoundingClientRect()
          const alignedWithName = rect.bottom >= nameRect.top - 2 && rect.top <= nameRect.bottom + 2
          const inRightColumn = rect.left >= rowRect.left + rowRect.width * 0.65
          return rect.width > 2 && rect.height > 2 && alignedWithName && inRightColumn
        })
        .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)[0]
      const previousTimestamp = row.querySelector(`[${SELECTORS.sidebar.timestampMarker}]`)
      if (previousTimestamp !== timestamp) {
        previousTimestamp?.removeAttribute(SELECTORS.sidebar.timestampMarker)
        timestamp?.setAttribute(SELECTORS.sidebar.timestampMarker, 'true')
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Floating quick-toggle + sidebar restore button (extension-owned elements).
// ---------------------------------------------------------------------------

function ensureFloatingToggle(settings: PrivacySettings): void {
  const existing = document.getElementById(SELECTORS.floatingToggleId)

  if (!settings.floatingControl.enabled) {
    existing?.remove()
    return
  }

  let button = existing as HTMLButtonElement | null
  if (!button) {
    button = document.createElement('button')
    button.id = SELECTORS.floatingToggleId
    button.type = 'button'
    button.innerHTML = `<span class="wa-privacy-dot"></span><span class="wa-privacy-label"></span>`
    button.addEventListener('click', async () => {
      const next = await updateSettings((current) => ({ ...current, enabled: !current.enabled }))
      renderFloatingToggle(next)
    })
    document.body.appendChild(button)
  }
  renderFloatingToggle(settings)
}

function renderFloatingToggle(settings: PrivacySettings): void {
  const button = document.getElementById(SELECTORS.floatingToggleId)
  if (!button) return
  button.classList.toggle('wa-privacy-off', !settings.enabled)
  const label = button.querySelector('.wa-privacy-label')
  if (label) label.textContent = settings.enabled ? 'Privacy On' : 'Privacy Off'
}

function ensureRestoreButton(settings: PrivacySettings): void {
  const shouldShow = settings.enabled && settings.sidebar.hidden
  let button = document.getElementById(SELECTORS.restoreButtonId) as HTMLButtonElement | null

  if (!shouldShow) {
    button?.remove()
    return
  }
  if (!button) {
    button = document.createElement('button')
    button.id = SELECTORS.restoreButtonId
    button.type = 'button'
    button.textContent = '☰ Show sidebar'
    button.addEventListener('click', () => {
      void updateSettings((current) => ({
        ...current,
        sidebar: { ...current.sidebar, hidden: false },
      }))
    })
    document.body.appendChild(button)
  }
}

// ---------------------------------------------------------------------------

function applyAll(settings: PrivacySettings): void {
  applyRootClasses(settings)
  applyCssVariables(settings)
  activeChatTrackingEnabled = settings.enabled && settings.sidebar.keepActiveChatVisible
  if (!activeChatTrackingEnabled) clearActiveMarker()
  ensureFloatingToggle(settings)
  ensureRestoreButton(settings)
}

export async function startPrivacyController(): Promise<void> {
  injectStylesheet()

  const settings = await getSettings()
  applyAll(settings)
  bindSidebarClickDelegation()
  tagSidebarTargets()

  // Re-bind the click delegation if WhatsApp swaps out the sidebar container
  // (e.g. switching between Chats / Communities / Archived), and re-show the
  // floating controls if WhatsApp's own re-render happens to remove them.
  debouncedObserver(
    document.body,
    () => {
      bindSidebarClickDelegation()
      tagSidebarTargets()
    },
    { childList: true, subtree: true },
    16,
  )

  onSettingsChanged((next) => applyAll(next))
}
