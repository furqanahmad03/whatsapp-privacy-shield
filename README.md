# WhatsApp Privacy Shield

A privacy control center for [WhatsApp Web](https://web.whatsapp.com/). Blur or
hide the sidebar, contact names, avatars, message previews and the open
chat's header — independently, instantly, and entirely on your device.

Built with Manifest V3, TypeScript, and Vite — no React, no runtime
frameworks, no network calls.

## Features

- **Sidebar privacy** — independently blur names, avatars, message previews,
  timestamps, unread counters and search results, or hide the sidebar
  outright. "Keep open chat visible" exempts the currently-active row from
  blurring.
- **Opened chat header privacy** — independently blur the chat/group name,
  avatar, online/last-seen status and group subtitle, or blur the whole
  header with one switch. Turning that switch off returns each item to its
  own setting instead of forcing anything.
- **7 privacy styles** — Standard Blur, Strong Blur, Frosted Glass,
  Pixelated, Privacy Block, Dim/Fade and Hidden — plus a 2–30px strength
  slider and rounded/flat overlay shape, all applied live.
- **Blur Everything** panic button for when someone walks up or you start
  screen-sharing, with **Restore Previous** to undo it.
- **Privacy Mode** master switch — turn protection off without losing any of
  your configured settings.
- Optional floating quick-toggle inside WhatsApp Web, and an optional
  `Ctrl+Shift+P` keyboard shortcut.
- Settings persist via `chrome.storage.local` and apply instantly — no
  reload of WhatsApp or the extension required.

## Project structure

```
manifest.json          MV3 manifest (source of truth; crxjs rewrites it at build time)
vite.config.ts
tsconfig.json
scripts/generate-icons.py   generates public/icons/*.png (no external assets)

src/
  content/
    index.ts            content-script entry: waits for #app, starts the controller
    selectors.ts         *** single source of truth for every WhatsApp DOM selector ***
    style-generator.ts   turns selectors.ts + the 7 privacy styles into one <style> tag
    observer.ts           tiny MutationObserver helpers (wait-for-element, debounce)
    privacy-controller.ts orchestrates: injects CSS once, toggles root classes/vars,
                           tracks the active chat row, renders the floating controls
    styles.css             static styles only (CSS variables, floating widget) — nothing
                           WhatsApp-selector-specific lives here, see style-generator.ts

  background/
    index.ts              handles the two optional keyboard commands, nothing else

  popup/
    index.html / popup.css / popup.ts   the control panel UI

  storage/
    defaults.ts            default settings + the "Blur Everything" preset
    settings.ts             all chrome.storage.local access goes through here

  shared/
    types.ts                the PrivacySettings model
```

## How it stays fast on a page that constantly re-renders

WhatsApp Web replaces DOM nodes continuously (new messages, chat switches,
virtualized scrolling). Rather than re-scanning the DOM on every change, the
extension does almost everything with CSS:

1. On load, `style-generator.ts` builds **one** stylesheet from the selectors
   in `selectors.ts` — a rule per (privacy style × target), scoped with the
   forgiving `:is(...)` selector so any one outdated fallback doesn't break
   the rest. It's injected once and never rewritten.
2. Turning a setting on/off just toggles a class on `<html>`
   (`wa-privacy-sidebar-names`, `wa-privacy-header-avatar`, …) or the active
   style (`wa-privacy-style-block`, …). Because the rules are plain CSS
   selectors, they apply automatically to every element WhatsApp adds later
   — no observer callback needed to "catch" new messages or rows.
3. Blur strength and the corner-radius/overlay shape are CSS custom
   properties (`--wa-privacy-blur-strength`, `--wa-privacy-radius`) updated
   directly on `<html>.style` — moving the slider is a single property write,
   not a stylesheet rebuild.
4. The only real DOM work is a **debounced** `MutationObserver` (see
   `observer.ts`) used for two narrow, cheap things: waiting for WhatsApp's
   `#app` to exist on first load, and re-binding one delegated click listener
   if WhatsApp swaps out the whole sidebar container (e.g. switching between
   Chats/Communities/Archived). Nothing walks the full tree or polls.
5. "Keep open chat visible" is done with one delegated `click` listener on
   the sidebar (not a scan): clicking a row tags it with
   `data-wa-privacy-active`, and every sidebar rule is generated with a
   `:not([data-wa-privacy-active])` guard, so the CSS itself skips that row.

## Selector maintenance (important)

WhatsApp regenerates its CSS class names on nearly every deploy, so
`src/content/selectors.ts` deliberately avoids them, preferring in order:
`data-testid` attributes → ARIA roles/labels → structural attribute
heuristics (`span[title]` for truncated text, `img[src^="blob:"]` for
avatars). Every entry is a list of fallback selectors, most-specific first.

**If a future WhatsApp update breaks blurring, this is the only file that
should need editing.** Open WhatsApp Web, inspect the element in DevTools,
and update the relevant selector list — `style-generator.ts` and the popup
don't need to change.

Two known limitations worth knowing about, both documented in
`selectors.ts`:

- **Unread badges** are matched via `span[aria-label*="unread" i]`, which
  relies on WhatsApp's English-language accessibility label. Under a
  non-English WhatsApp UI this toggle may not match anything.
- **Header status vs. group subtitle**: WhatsApp reuses a single line under
  the header name for both online/last-seen status (1:1 chats) and the
  participant list (groups) — there's no separate DOM slot for each. Both
  settings target that same element, so enabling either one blurs it.

## Settings model

```ts
interface PrivacySettings {
  enabled: boolean
  sidebar: {
    blurAll: boolean
    hidden: boolean
    names: boolean
    avatars: boolean
    messagePreviews: boolean
    timestamps: boolean
    unreadCounters: boolean
    searchResults: boolean
    keepActiveChatVisible: boolean
  }
  header: {
    blurAll: boolean
    name: boolean
    avatar: boolean
    status: boolean
    subtitle: boolean
  }
  appearance: {
    style: 'blur' | 'strong-blur' | 'frosted' | 'pixelated' | 'block' | 'dim' | 'hidden'
    blurStrength: number      // 2–30
    overlayShape: 'rounded' | 'flat'
  }
  floatingControl: { enabled: boolean }
}
```

Stored under a single `chrome.storage.local` key, with a version-tolerant
merge against defaults so new fields introduced later never leave the
settings object incomplete.

## Permissions, and why each is needed

| Permission | Why |
| --- | --- |
| `storage` | Persist your settings (and the one-shot "Blur Everything" snapshot) locally with `chrome.storage.local`. |
| `host_permissions: https://web.whatsapp.com/*` | Required so the content script and its CSS can run on WhatsApp Web — nothing else. |

That's the entire permission set. The extension does not request `tabs`,
`scripting`, `activeTab`, host access to any other site, or any network
permission — because it never talks to a network. See **Security** below.

## Security & privacy

This extension is purely visual/presentational:

- No chat content, contact names, or messages are read, stored, or
  transmitted anywhere. The extension has no `fetch`/`XMLHttpRequest`/
  `WebSocket` calls at all, no analytics, and no remote code — everything
  it applies to the page is CSS-driven and generated from the code you can
  read in this repo.
- The only data ever persisted is your own configuration (which toggles are
  on, which style/strength you picked), saved to `chrome.storage.local`,
  which never leaves the browser.
- No screenshots or DOM content are ever captured.

## Build instructions

Requires Node 18+.

```bash
npm install
npm run build      # type-checks, then builds to dist/
```

`npm run dev` starts a Vite dev server with HMR for the popup and content
script (useful while iterating); `npm run typecheck` runs just the
TypeScript check.

Icons in `public/icons/` are generated (not hand-drawn assets) — regenerate
them with `npm run icons` if you want to change the mark (requires Python 3
with Pillow).

## Load the extension in Chrome ("Load unpacked")

1. Run `npm install && npm run build` — this produces a `dist/` folder.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/` folder (not the project
   root).
5. Open [web.whatsapp.com](https://web.whatsapp.com/) and log in as usual —
   the extension's popup (toolbar icon) opens the control panel.

Whenever you rebuild (`npm run build`), click the refresh icon on the
extension's card in `chrome://extensions` to pick up the new `dist/`.

## Keyboard shortcut

`Ctrl+Shift+P` (`Cmd+Shift+P` on macOS) toggles Privacy Mode on/off by
default. A second command, **Blur Everything**, is registered without a
default key so it can't collide with anything on your system — assign one
yourself if you want it.

Chrome extension shortcuts are never silently forced onto you: if
`Ctrl+Shift+P` conflicts with another extension or a browser shortcut on
your machine, Chrome simply won't bind it. To view or customize any of
these, go to `chrome://extensions/shortcuts`.

## Notes on the "Pixelated" style

True per-pixel mosaic of live DOM text isn't something CSS can do without
rasterizing each element to a canvas continuously — which would mean
constant, expensive redraws on a page that's already re-rendering itself.
"Pixelated" here is a deliberate CSS approximation (a light blur combined
with high contrast/desaturation) that reads as a distinct, blockier privacy
style rather than true pixel mosaicing.

## Developer

Developed by [Furqan Ahmad](https://furqanahmad.me/), Software & AI Engineer.
# whatsapp-privacy-shield
