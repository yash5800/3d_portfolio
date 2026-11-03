import { VISITOR_COUNT_URL } from '../config/sceneConfig.js'

/**
 * Reads the site-wide visitor total from GoatCounter's counter JSON.
 *
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>} The formatted total
 */
export async function fetchVisitorCount(signal) {
  const response = await fetch(VISITOR_COUNT_URL, { signal })
  if (!response.ok) {
    throw new Error(`Visitor counter responded ${response.status}`)
  }

  const data = await response.json()
  const count = String(data?.count ?? '').replace(/[^0-9,]/g, '')
  if (!count) throw new Error('Visitor counter returned no count')
  return count
}
