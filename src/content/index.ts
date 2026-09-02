import { waitForElement } from './observer'
import { SELECTORS } from './selectors'
import { startPrivacyController } from './privacy-controller'

async function main(): Promise<void> {
  // WhatsApp Web is a client-rendered SPA — #app may not exist yet even at
  // document_idle on a cold load, so wait for it once before doing anything.
  await waitForElement(SELECTORS.appRoot)
  await startPrivacyController()
}

main().catch((error) => {
  console.error('[WhatsApp Privacy Shield] failed to start:', error)
})
