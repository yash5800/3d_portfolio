import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { Center, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import Model from './components/Model.jsx'
import MicroDuck from './components/MicroDuck.jsx'
import SoundToggle from './components/SoundToggle.jsx'
import { usePortfolioReady } from './hooks/usePortfolioReady.js'
import {
  CAMERA_SETTINGS,
  CONTROLS_TARGET,
  GL_SETTINGS,
  MAX_ORBIT_AZIMUTH,
  MAX_ZOOM_DISTANCE,
  MIN_ORBIT_AZIMUTH,
  MIN_ZOOM_DISTANCE,
} from './config/sceneConfig.js'
import CameraLogger from './components/CameraLogger.jsx'
import TestModel from "./TestModel.jsx"

function ResponsiveCamera({ isMobile }) {
  const { camera, controls } = useThree()

  useEffect(() => {
    if (!camera.isPerspectiveCamera || !controls) return

    const target = new Vector3(...CONTROLS_TARGET)
    if (isMobile) {
      const direction = new Vector3(...CAMERA_SETTINGS.position).sub(target).normalize()
      camera.position.copy(target).addScaledVector(direction, 20)
      camera.fov = 50
    } else {
      camera.position.set(...CAMERA_SETTINGS.position)
      camera.fov = CAMERA_SETTINGS.fov
    }

    camera.updateProjectionMatrix()
    controls.target.copy(target)
    controls.update()
  }, [camera, controls, isMobile])

  return null
}

/**
 * Main 3D portfolio scene canvas and viewer.
 * Manages overall scene setup, environment lighting, orbit camera controls,
 * and the floating "back to home" zoom-exit button.
 */
export default function Scene() {
  const [focusView, setFocusView] = useState(null)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  const focusApi = useRef(null)
  // The duck is its own glTF primitive, so the room's raycaster needs its group
  // to catch clicks on it.
  const duckRef = useRef(null)
  const portfolioReady = usePortfolioReady()

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const update = (event) => setIsMobile(event.matches)
    setIsMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])


  return (
    <>
      <Canvas
        camera={CAMERA_SETTINGS}
        shadows
        dpr={[1, 1.5]}
        gl={GL_SETTINGS}
      >
        <Suspense fallback={null}>
          <Center>
            <Model
              focusApi={focusApi}
              onFocusChange={setFocusView}
              focusView={focusView}
              duckRef={duckRef}
            />
            <MicroDuck rootRef={duckRef} />
          </Center>

          <ContactShadows opacity={0.5} blur={2.5} far={4} resolution={512} frames={1} />
          <Environment
              files={`${import.meta.env.BASE_URL}hdri/photo_studio_01_1k.hdr`}
              environmentIntensity={1.15}
          />
        </Suspense>
        // <CameraLogger />
        <OrbitControls
          makeDefault
          target={CONTROLS_TARGET}
          minAzimuthAngle={MIN_ORBIT_AZIMUTH}
          maxAzimuthAngle={MAX_ORBIT_AZIMUTH}
          minDistance={MIN_ZOOM_DISTANCE}
          maxDistance={isMobile ? 32 : MAX_ZOOM_DISTANCE}
          maxPolarAngle={Math.PI / 2}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
        />
        <ResponsiveCamera isMobile={isMobile} />
      </Canvas>

      {/* Page-level speaker button while the model is in view (not on the monitor) */}
      {portfolioReady && focusView !== 'screen' && <SoundToggle />}

      {/* Floating back button visible when zoomed into a frame or the screen */}
      {focusView && (
        <div className="exit-host">
          <button
            type="button"
            className="exit-zoom"
            onClick={() => focusApi.current?.exit()}
          >
            ← back to home
          </button>
        </div>
      )}
    </>
  )
}
