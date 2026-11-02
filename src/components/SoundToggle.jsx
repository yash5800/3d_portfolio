import { useSyncExternalStore } from 'react'
import { isRexSpeaking, subscribeRexSpeaking } from '../utils/audio.js'
import { isMuted, subscribeMuted, toggleMuted } from '../utils/videoMute.js'

/**
 * Speaker button rendered as normal page HTML (top of the browser window),
 * not as part of the monitor's 3D texture. Toggles audio for the video
 * playing on the monitor.
 *
 * Locked while the rex figure speaks so the monitor cannot be unmuted over
 * its narration.
 */
export default function SoundToggle() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted)
  const rexSpeaking = useSyncExternalStore(subscribeRexSpeaking, isRexSpeaking)
  const label = rexSpeaking
    ? 'Rex is speaking — sound toggle unavailable'
    : muted
      ? 'Unmute video'
      : 'Mute video'

  return (
    <div className="sound-host">
      <button
        type="button"
        className="sound-toggle"
        onClick={toggleMuted}
        aria-label={label}
        aria-pressed={!muted}
        aria-disabled={rexSpeaking}
        disabled={rexSpeaking}
        title={label}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M3 9.5v5h3.6L12 18.6V5.4L6.6 9.5H3z" fill="currentColor" />
          {muted ? (
            <path
              d="M15.6 9.8l4.8 4.4M20.4 9.8l-4.8 4.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ) : (
            <>
              <path
                d="M15.4 9.2a4.2 4.2 0 0 1 0 5.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M18 6.9a7.6 7.6 0 0 1 0 10.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
