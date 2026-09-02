import { SELECTORS, cssAny } from './selectors'
import type { PrivacyStyle } from '../shared/types'

/**
 * Builds the single WhatsApp-selector-dependent stylesheet, injected once by
 * the content script. Everything selector-specific lives here so that a
 * WhatsApp DOM change only ever requires editing `selectors.ts`; this file
 * just wires those selectors up to the per-style visual effects.
 *
 * Blur strength / corner radius are read from CSS custom properties that the
 * content script updates directly (`--wa-privacy-blur-strength` etc.), so
 * moving the intensity slider or switching styles never re-injects CSS.
 */

// WhatsApp virtualizes and recycles chat rows while scrolling. Transitions on
// privacy effects briefly animate those new nodes from clear to obscured.
const INSTANT_EFFECT = 'transition: none !important;'

const STYLES: PrivacyStyle[] = [
  'blur',
  'strong-blur',
  'frosted',
  'pixelated',
  'block',
  'dim',
  'hidden',
]

function textEffect(style: PrivacyStyle): string {
  switch (style) {
    case 'blur':
      return 'filter: blur(var(--wa-privacy-blur-strength)) !important;'
    case 'strong-blur':
      return 'filter: blur(calc(var(--wa-privacy-blur-strength) * 2.2)) saturate(0.5) !important;'
    case 'frosted':
      return 'filter: blur(calc(var(--wa-privacy-blur-strength) * 0.75)) !important; opacity: 0.7 !important;'
    case 'pixelated':
      return 'filter: blur(2px) contrast(2.4) saturate(0.15) !important;'
    case 'block':
      return (
        'color: transparent !important; -webkit-text-fill-color: transparent !important; ' +
        'background-color: var(--wa-privacy-block-bg) !important; ' +
        'border-radius: var(--wa-privacy-radius) !important; text-shadow: none !important; ' +
        'box-decoration-break: clone !important; -webkit-box-decoration-break: clone !important;'
      )
    case 'dim':
      return 'opacity: var(--wa-privacy-dim-opacity) !important;'
    case 'hidden':
      return 'visibility: hidden !important;'
  }
}

function imageEffect(style: PrivacyStyle): string {
  switch (style) {
    case 'blur':
      return 'filter: blur(var(--wa-privacy-blur-strength)) !important;'
    case 'strong-blur':
      return 'filter: blur(calc(var(--wa-privacy-blur-strength) * 2.2)) saturate(0.4) !important;'
    case 'frosted':
      return 'filter: blur(calc(var(--wa-privacy-blur-strength) * 0.75)) brightness(0.92) !important; opacity: 0.85 !important;'
    case 'pixelated':
      return 'filter: blur(3px) contrast(2.6) saturate(0.1) !important;'
    case 'block':
      return (
        'filter: blur(calc(var(--wa-privacy-blur-strength) * 2.5)) brightness(0.22) saturate(0) !important; ' +
        'border-radius: var(--wa-privacy-radius) !important;'
      )
    case 'dim':
      return 'opacity: var(--wa-privacy-dim-opacity) !important;'
    case 'hidden':
      return 'visibility: hidden !important;'
  }
}

interface TargetGroup {
  /** Root <html> class that gates this rule, e.g. "wa-privacy-sidebar-names". */
  className: string
  /** Selectors relative to `scope`. */
  relativeSelectors: readonly string[]
  scope: 'sidebarRow' | 'header' | 'sidebarSearchActive'
  kind: 'text' | 'image'
}

const SIDEBAR_ROW_GUARDED = `${cssAny(SELECTORS.sidebar.container)} ${cssAny(
  SELECTORS.sidebar.row,
)}:not([${SELECTORS.sidebar.activeRowMarker}])`
const HEADER_SCOPE = cssAny(SELECTORS.header.container)
const SEARCH_ACTIVE_ROW = `${cssAny(SELECTORS.sidebar.container)}:has(${cssAny(
  SELECTORS.sidebar.search,
)}:not(:empty)) ${cssAny(SELECTORS.sidebar.row)}:not([${SELECTORS.sidebar.activeRowMarker}])`

const TARGET_GROUPS: TargetGroup[] = [
  { className: 'wa-privacy-sidebar-names', relativeSelectors: SELECTORS.sidebar.name, scope: 'sidebarRow', kind: 'text' },
  { className: 'wa-privacy-sidebar-avatars', relativeSelectors: SELECTORS.sidebar.avatar, scope: 'sidebarRow', kind: 'image' },
  { className: 'wa-privacy-sidebar-previews', relativeSelectors: SELECTORS.sidebar.messagePreview, scope: 'sidebarRow', kind: 'text' },
  { className: 'wa-privacy-sidebar-timestamps', relativeSelectors: SELECTORS.sidebar.timestamp, scope: 'sidebarRow', kind: 'text' },
  { className: 'wa-privacy-sidebar-unread', relativeSelectors: SELECTORS.sidebar.unreadBadge, scope: 'sidebarRow', kind: 'text' },
  {
    className: 'wa-privacy-sidebar-searchresults',
    relativeSelectors: [...SELECTORS.sidebar.name, ...SELECTORS.sidebar.avatar, ...SELECTORS.sidebar.messagePreview],
    scope: 'sidebarSearchActive',
    kind: 'text',
  },
  { className: 'wa-privacy-header-name', relativeSelectors: SELECTORS.header.name, scope: 'header', kind: 'text' },
  { className: 'wa-privacy-header-avatar', relativeSelectors: SELECTORS.header.avatar, scope: 'header', kind: 'image' },
  { className: 'wa-privacy-header-status', relativeSelectors: SELECTORS.header.statusOrSubtitle, scope: 'header', kind: 'text' },
  { className: 'wa-privacy-header-subtitle', relativeSelectors: SELECTORS.header.statusOrSubtitle, scope: 'header', kind: 'text' },
]

function scopeSelector(group: TargetGroup): string {
  const inner = cssAny(group.relativeSelectors)
  switch (group.scope) {
    case 'sidebarRow':
      return `${SIDEBAR_ROW_GUARDED} ${inner}`
    case 'sidebarSearchActive':
      return `${SEARCH_ACTIVE_ROW} ${inner}`
    case 'header':
      return `${HEADER_SCOPE} ${inner}`
  }
}

export function generatePrivacyStylesheet(): string {
  const chunks: string[] = []

  for (const style of STYLES) {
    const effect = { text: textEffect(style), image: imageEffect(style) }
    for (const group of TARGET_GROUPS) {
      const selector = scopeSelector(group)
      const declarations = effect[group.kind]
      chunks.push(
        `html.wa-privacy-enabled.wa-privacy-style-${style}.${group.className} ${selector} { ${declarations} ${INSTANT_EFFECT} }`,
      )
    }
  }

  // Sidebar collapse — layout-only, independent of the chosen privacy style.
  const sidebarScope = cssAny(SELECTORS.sidebar.container)
  chunks.push(`
    html.wa-privacy-sidebar-hidden ${sidebarScope} { display: none !important; }
    html.wa-privacy-sidebar-hidden ${cssAny(SELECTORS.mainPane)} { flex: 1 1 auto !important; width: 100% !important; }
  `)

  return chunks.join('\n')
}
