import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useGLTF } from '@react-three/drei'
import OsScreen from './OsScreen.jsx'
import ScreenFocus from './ScreenFocus.jsx'
import RexComic from './RexComic.jsx'
import { isRexSpeaking, playRexSound, subscribeRexSpeaking } from '../utils/audio.js'
import FramesDisplayManager from './FramesVideoReplacer.jsx'

/**
 * Loads the 3D portfolio room model and attaches interactive overlays
 * (screen OS and camera zoom controller).
 *
 * @param {object} props
 * @param {React.MutableRefObject} props.focusApi - Ref to pass to ScreenFocus for controlling zoom exit
 * @param {Function} props.onFocusChange - Callback when focus target changes
 * @param {string | null} props.focusView - Current active focus target ('screen' | 'frame' | null)
 * @param {React.MutableRefObject} props.duckRef - Group holding the roaming micro duck
 */
export default function Model({ focusApi, onFocusChange, focusView, duckRef }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/portfolio.glb`)
  const screen = useMemo(() => scene.getObjectByName('screen'), [scene])
  const rex = useMemo(() => scene.getObjectByName('rex'), [scene])
  const [hoveredRex, setHoveredRex] = useState(false)
  const [burstKey, setBurstKey] = useState(0)
  const [activationKey, setActivationKey] = useState(0)
  const [wavesVisible, setWavesVisible] = useState(false)
  const rexSpeaking = useSyncExternalStore(subscribeRexSpeaking, isRexSpeaking)
  const burstTimeout = useRef(null)
  const [promptVisible, setPromptVisible] = useState(true)
  const handleRexClick = useCallback(() => {
    playRexSound()
    setPromptVisible(false)
    setBurstKey((key) => key + 1)
    setActivationKey((key) => key + 1)
    window.clearTimeout(burstTimeout.current)
    burstTimeout.current = window.setTimeout(() => setBurstKey(0), 620)
  }, [])
  useEffect(() => () => window.clearTimeout(burstTimeout.current), [])
  useEffect(() => {
    setWavesVisible(false)
    if (!rexSpeaking) return undefined
    const timeout = window.setTimeout(() => setWavesVisible(true), 620)
    return () => window.clearTimeout(timeout)
  }, [rexSpeaking, activationKey])

  return (
    <>
      <primitive object={scene} />
      <FramesDisplayManager
        scene={scene}
        active={rexSpeaking}
      />
      <OsScreen mesh={screen} focusedOnScreen={focusView === 'screen'} />
      <RexComic mesh={rex} promptVisible={promptVisible} hovered={hoveredRex} burstKey={burstKey} wavesVisible={wavesVisible} onComicClick={handleRexClick} />
      <ScreenFocus
        mesh={screen}
        scene={scene}
        duckRef={duckRef}
        focusApi={focusApi}
        onFocusChange={onFocusChange}
        onRexClick={handleRexClick}
        onRexHover={setHoveredRex}
      />
    </>
  )
}

// Preload the GLTF model for smoother experience
useGLTF.preload(`${import.meta.env.BASE_URL}models/portfolio.glb`)
