/**
 * Mute state for the video playing on the monitor.
 *
 * Lives outside React so the toggle can unmute synchronously inside the click
 * gesture — browsers only allow audible playback after a user gesture.
 * Starts muted because the video autoplays.
 */

let muted = true
const videos = new Set()
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener(muted)
}

function applyTo(video) {
  video.muted = muted
  if (muted) return

  // Autoplay with sound can be blocked (no user gesture yet, or a strict
  // browser): fall back to muted playback so the video keeps running and the
  // button reflects what is actually heard.
  const revert = () => {
    video.muted = true
    muted = true
    notify()
  }

  try {
    video.play()?.catch(revert)
  } catch {
    revert()
  }
}

/**
 * Keeps one <video> element in sync with the current mute state.
 * @param {HTMLVideoElement} video
 * @returns {() => void} unregister
 */
export function registerVideo(video) {
  videos.add(video)
  applyTo(video)
  return () => videos.delete(video)
}

export function isMuted() {
  return muted
}

/**
 * @param {(muted: boolean) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeMuted(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setMuted(next) {
  if (next === muted) return
  muted = next
  for (const video of videos) applyTo(video)
  notify()
}

export function toggleMuted() {
  setMuted(!muted)
}
