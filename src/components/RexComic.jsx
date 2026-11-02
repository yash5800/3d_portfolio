import { createPortal } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import './rexComic.css'

/** Camera-facing comic cues anchored to Rex's own GLTF mesh. */
export default function RexComic({ mesh, promptVisible, hovered, burstKey, wavesVisible, onComicClick }) {
  if (!mesh) return null

  const activateComic = (event) => {
    event.stopPropagation()
    onComicClick?.()
  }

  return createPortal(
    <Html
      transform
      distanceFactor={0.72}
      position={[-0.02, 0.45, -0.04]}
      zIndexRange={[30, 0]}
      style={{ width: 520, height: 400, pointerEvents: 'auto' }}
    >
      <div className={`rex-comic${hovered ? ' is-hovered' : ''}`} aria-hidden="true">
        {promptVisible && (
          <>
            <span className="rex-comic__glow" />
            <img className="rex-comic__prompt" src={`${import.meta.env.BASE_URL}assets/rex-comic/prompt.svg`} alt="" onClick={activateComic} />
            <img className="rex-comic__arrows" src={`${import.meta.env.BASE_URL}assets/rex-comic/arrows.svg`} alt="" onClick={activateComic} />
            <img className="rex-comic__doodles" src={`${import.meta.env.BASE_URL}assets/rex-comic/doodles.svg`} alt="" onClick={activateComic} />
          </>
        )}
        {wavesVisible && (
          <>
            <img className="rex-comic__waves rex-comic__waves--first" src={`${import.meta.env.BASE_URL}assets/rex-comic/waves.svg`} alt="" onClick={activateComic} />
            <img className="rex-comic__waves rex-comic__waves--second" src={`${import.meta.env.BASE_URL}assets/rex-comic/waves.svg`} alt="" onClick={activateComic} />
          </>
        )}
        {burstKey > 0 && (
          <img
            key={burstKey}
            className="rex-comic__burst"
            src={`${import.meta.env.BASE_URL}assets/rex-comic/burst.svg`}
            alt=""
            onClick={activateComic}
          />
        )}
      </div>
    </Html>,
    mesh,
  )
}
