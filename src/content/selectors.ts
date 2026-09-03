/**
 * Centralized WhatsApp Web DOM selectors.
 *
 * WhatsApp regenerates its CSS class names on almost every deploy, so this
 * file deliberately avoids matching on them. Instead it prefers, in order:
 *   1. `data-testid` attributes (WhatsApp's own test hooks — the closest
 *      thing it has to a stable contract, though they do occasionally move).
 *   2. ARIA roles / labels (`role="row"`, `role="listitem"`, `aria-label`),
 *      which WhatsApp keeps for its own accessibility support.
 *   3. Structural/attribute heuristics (`img` inside a row, `span[title]`
 *      for truncated text) that survive class-name churn.
 *
 * If WhatsApp ships a DOM change that breaks the extension, THIS is the only
 * file that should need editing — everything else consumes these constants
 * rather than querying WhatsApp's DOM directly.
 *
 * Every entry is a list of fallback selectors, tried most-specific first.
 * `cssAny()` turns a list into a single forgiving `:is(...)` selector so one
 * outdated fallback doesn't break the others.
 */

/** Joins fallback selectors into one forgiving selector for use in stylesheets. */
export function cssAny(selectors: readonly string[]): string {
  return `:is(${selectors.join(', ')})`
}

export const SELECTORS = {
  /** The element WhatsApp Web mounts its whole app into. */
  appRoot: ['#app'],

  /** Right-hand pane with the open conversation. */
  mainPane: ['#main'],

  sidebar: {
    /** The left column: search box + chat list, scoped so we never touch #main. */
    container: ['#pane-side', 'div[aria-label="Chat list"]'],

    /** Search input wrapper, so it can be excluded from "hide sidebar". */
    /** The editable search input itself (not its wrapper), so callers can
     *  test whether the user has actually typed a query into it. */
    search: [
      'div[data-testid="chat-list-search"] div[contenteditable="true"]',
      'div[role="textbox"][contenteditable="true"]',
    ],

    /** One row in the chat list. Kept relative to `container` so every
     *  consumer scopes these fallbacks to the sidebar. */
    row: [
      'div[role="row"]',
      'div[data-testid="cell-frame-container"]',
      'div[role="listitem"]',
    ],

    /** Marker applied by our own click handler (see privacy-controller) to
     *  the currently-open row, used for "keep active chat visible". */
    activeRowMarker: 'data-wa-privacy-active',

    /** Marker applied to visually identified timestamps when WhatsApp does
     *  not expose a stable semantic attribute for them. */
    timestampMarker: 'data-wa-privacy-timestamp',

    /** Truncated display name — WhatsApp puts the full name in `title`. */
    name: [
      'div[data-testid="cell-frame-title"] span[title]',
      'span[dir="auto"][title]',
    ],

    /** Avatar image or the placeholder-avatar SVG when no photo is set. */
    avatar: [
      // Disappearing-message chats render the profile picture as a 48px SVG.
      // The timer badge is a smaller SVG, so this does not target the badge.
      'svg[width="48"][height="48"]',
      'img[src]:not([data-testid="cell-frame-secondary"] img)',
      'span[data-testid="default-user"]',
    ],

    /** Last-message preview text (second line of the row). */
    messagePreview: [
      '[data-testid="cell-frame-secondary"]',
      'span[dir="ltr"]:not([title])',
      'div[data-testid="last-msg-status"] + span',
    ],

    /** Row timestamp (first line, opposite the name). */
    timestamp: [
      '[data-wa-privacy-timestamp]',
      '[data-testid="cell-frame-time"]',
      '[data-testid="cell-frame-timestamp"]',
      'div[data-testid="cell-frame-title"] ~ div span[dir="auto"]:not([title])',
    ],

    /** Unread-count badge. Relies on WhatsApp's own accessibility label,
     *  so it only matches under English-language UI — see README. */
    unreadBadge: ['span[aria-label*="unread" i]'],
  },

  /** Rows produced by the sidebar search field. */
  searchResults: {
    row: [
      'div[role="row"]',
      'div[data-testid="cell-frame-container"]',
      'div[role="listitem"]',
    ],
  },

  header: {
    /** Header bar above the open conversation. */
    container: ['header[data-testid="conversation-header"]', '#main header'],

    /** Contact or group name shown in the header. */
    name: [
      'span[data-testid="conversation-info-header-chat-title"]',
      'header span[dir="auto"][title]:first-of-type',
    ],

    avatar: [
      'header svg[width="40"][height="40"]',
      'header img',
      'header span[data-testid="default-user"]',
    ],

    /**
     * WhatsApp reuses a single line under the header name for two different
     * things depending on chat type: online/last-seen/typing status for a
     * 1:1 chat, or the participant list for a group. There is no separate
     * DOM slot for each, so the "status" and "subtitle" settings both
     * target this same element — enabling either one blurs it.
     */
    statusOrSubtitle: [
      'header span[dir="auto"][title]:first-of-type ~ span[dir="auto"]',
      'header div[role="button"] span[dir="auto"]:nth-of-type(2)',
    ],
  },

  /** Floating restore button shown when the sidebar is fully hidden. */
  restoreButtonId: 'wa-privacy-restore-sidebar',

  /** Small always-available privacy toggle, optional per settings. */
  floatingToggleId: 'wa-privacy-floating-toggle',
} as const
