import { isMuted, setMuted } from './videoMute.js'

/**
 * Sound files shipped with the app, keyed by the object they belong to.
 * Files live in public/sounds/actions/.
 */
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`

const ACTION_SOUNDS = {
  keyboard: assetUrl('sounds/actions/keyboard.mp3'),
  mouse: assetUrl('sounds/actions/mouse.mp3'),
  zoomIn: assetUrl('sounds/actions/zoomin-whoosh.mp3'),
  zoomOut: assetUrl('sounds/actions/zoomout-whoosh.mp3'),
  duck: assetUrl('sounds/microduck/robot-power-off.mp3'),
  squish: assetUrl('sounds/actions/squish-pop.mp3'),
}

/** One reusable <audio> element per action, so repeats restart instead of piling up. */
const actionPlayers = new Map()

function getActionPlayer(kind) {
  const src = ACTION_SOUNDS[kind]
  if (!src || typeof Audio === 'undefined') return null

  let audio = actionPlayers.get(kind)
  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    actionPlayers.set(kind, audio)
  }
  return audio
}

// Warm the cache up-front so the very first click plays without a fetch delay.
if (typeof Audio !== 'undefined') {
  for (const kind of Object.keys(ACTION_SOUNDS)) getActionPlayer(kind)
}

/**
 * Plays the recorded action sound for a scene object
 * ('keyboard' | 'mouse' | 'duck').
 * Falls back to the synthesized click if the file is missing or playback is
 * blocked (e.g. before the first user gesture).
 * @param {string} kind
 */
export function playActionSound(kind) {
  const audio = getActionPlayer(kind)
  if (!audio) return playClickSound(kind)

  try {
    audio.currentTime = 0
    void audio.play()?.catch(() => playClickSound(kind))
  } catch {
    playClickSound(kind)
  }
}

/**
 * Plays the squish sound for an object squash-popping under the cursor.
 * Unlike playActionSound this never falls back to the synthesized click:
 * a hover before the browser allows playback stays silent instead of beeping.
 */
export function playHoverSquish() {
  const audio = getActionPlayer('squish')
  if (!audio) return

  try {
    audio.currentTime = 0
    void audio.play()?.catch(() => {})
  } catch {
    // Hover sound fails quietly (e.g. before the first user gesture).
  }
}

/**
 * Narration for the desk "rex" figure, in the order they must play.
 * Files live in public/sounds/rex/ and their numeric prefixes are the order:
 * every click advances one step, and once all five have been heard only the
 * fallback ever plays again.
 */
const REX_SOUNDS = [
  assetUrl('sounds/rex/1-welcome.mp3'),
  assetUrl('sounds/rex/2-about.mp3'),
  assetUrl('sounds/rex/3-projects.mp3'),
  assetUrl('sounds/rex/4-creativeside.mp3'),
  assetUrl('sounds/rex/5-final.mp3'),
]
const REX_FALLBACK = assetUrl('sounds/rex/fallback.mp3')

const rexPlayers = new Map()

function getRexPlayer(src) {
  if (typeof Audio === 'undefined') return null

  let audio = rexPlayers.get(src)
  if (!audio) {
    audio = new Audio(src)
    audio.preload = 'auto'
    rexPlayers.set(src, audio)
  }
  return audio
}

// Warm the cache up-front so the very first click plays without a fetch delay.
if (typeof Audio !== 'undefined') {
  for (const src of [...REX_SOUNDS, REX_FALLBACK]) getRexPlayer(src)
}

/** Next clip to play; frozen at the fallback once the five clips are spent. */
let rexStep = 0
/** The clip currently speaking, so overlapping clicks are ignored. */
let rexPlaying = null

const rexListeners = new Set()

function notifyRexSpeaking() {
  for (const listener of rexListeners) listener(rexPlaying !== null)
}

/** @returns {boolean} whether a rex clip is playing right now */
export function isRexSpeaking() {
  return rexPlaying !== null
}

/**
 * Subscribe to rex playback so the UI can lock while it speaks.
 * @param {(speaking: boolean) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeRexSpeaking(listener) {
  rexListeners.add(listener)
  return () => rexListeners.delete(listener)
}

/**
 * Plays the next rex clip in order (or the fallback once the sequence is
 * spent) and ducks the monitor video for as long as it speaks.
 *
 * Safe to call on every click: a click while a clip is still playing is
 * ignored so the order is never skipped.
 *
 * @returns {boolean} whether a clip actually started
 */
export function playRexSound() {
  if (rexPlaying) return false

  const step = rexStep
  const src = step < REX_SOUNDS.length ? REX_SOUNDS[step] : REX_FALLBACK
  const audio = getRexPlayer(src)
  if (!audio) return false

  // Remember how the monitor was left so it can be put back afterwards.
  const wasMuted = isMuted()
  let done = false

  const finish = () => {
    if (done) return
    done = true
    audio.removeEventListener('ended', finish)
    audio.removeEventListener('error', finish)
    if (rexPlaying === audio) {
      rexPlaying = null
      notifyRexSpeaking()
    }
    // Only restore if the visitor has not toggled the monitor mid-playback.
    if (isMuted()) setMuted(wasMuted)
  }

  // Play was blocked: hand the step back so the clip is not skipped.
  const rollback = () => {
    if (done) return
    if (rexStep === step + 1) rexStep = step
    finish()
  }

  rexPlaying = audio
  notifyRexSpeaking()
  setMuted(true)
  audio.addEventListener('ended', finish)
  audio.addEventListener('error', finish)

  try {
    audio.currentTime = 0
    rexStep = step + 1
    void audio.play()?.catch(rollback)
  } catch {
    rollback()
  }

  return true
}

/**
 * Lightweight synthesizer-based click sound using Web Audio API.
 * Fallback for when no audio asset is available.
 */
let clickAudioContext = null

/**
 * Plays a subtle click sound for interactive 3D elements (e.g. computer mouse).
 * @param {string} [kind] - Optional identifier for the click event
 */
export function playClickSound(kind) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  // Lazily instantiate audio context on first user interaction
  clickAudioContext ||= new AudioContext()
  if (clickAudioContext.state === 'suspended') {
    clickAudioContext.resume()
  }

  const oscillator = clickAudioContext.createOscillator()
  const gain = clickAudioContext.createGain()
  const now = clickAudioContext.currentTime

  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(420, now)
  oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.035)

  gain.gain.setValueAtTime(0.045, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045)

  oscillator.connect(gain)
  gain.connect(clickAudioContext.destination)

  oscillator.start(now)
  oscillator.stop(now + 0.05)
}
