/**
 * Small MutationObserver helpers, kept deliberately minimal:
 *  - `waitForElement` resolves once, then disconnects — used only to wait
 *    out WhatsApp's initial load.
 *  - `debouncedObserver` coalesces bursts of WhatsApp's own re-renders
 *    (new messages, chat switches, scroll-triggered virtualization) into a
 *    single callback instead of reacting to every individual mutation.
 *
 * Nothing here scans the DOM on a timer and nothing walks the full tree —
 * privacy is enforced by CSS matching new nodes automatically, so these
 * observers only ever do small, targeted bookkeeping.
 */

export function waitForElement(
  selectors: readonly string[],
  root: ParentNode = document,
  timeoutMs = 30_000,
): Promise<Element> {
  const found = querySelectorAny(selectors, root)
  if (found) return Promise.resolve(found)

  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      const el = querySelectorAny(selectors, root)
      if (el) {
        observer.disconnect()
        clearTimeout(timer)
        resolve(el)
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })

    const timer = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`waitForElement: timed out waiting for ${selectors.join(', ')}`))
    }, timeoutMs)
  })
}

function querySelectorAny(selectors: readonly string[], root: ParentNode): Element | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector)
    if (el) return el
  }
  return null
}

export interface DebouncedObserverHandle {
  disconnect: () => void
}

/** Observes `target` and calls `callback` at most once per `debounceMs`. */
export function debouncedObserver(
  target: Node,
  callback: () => void,
  options: MutationObserverInit,
  debounceMs = 200,
): DebouncedObserverHandle {
  let timer: ReturnType<typeof setTimeout> | null = null

  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(callback, debounceMs)
  })
  observer.observe(target, options)

  return {
    disconnect: () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    },
  }
}
