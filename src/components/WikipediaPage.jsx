import { useState } from 'react'
import { SCREEN_URL } from '../config/sceneConfig.js'

/**
 * Embedded portfolio OS web page inside an iframe with a loading placeholder.
 *
 * @param {object} props
 * @param {number} props.width - Display width in CSS pixels
 * @param {number} props.height - Display height in CSS pixels
 */
export default function WikipediaPage({ width, height }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        borderRadius: '4px',
        background: '#f8f9fa',
      }}
    >
      <iframe
        src={SCREEN_URL}
        title="OS"
        onLoad={() => setLoaded(true)}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 0,
          background: '#f8f9fa',
        }}
      />
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            font: '600 28px/1 system-ui, sans-serif',
            color: '#54595d',
            background: '#f8f9fa',
          }}
        >
          loading…
        </div>
      )}
    </div>
  )
}
