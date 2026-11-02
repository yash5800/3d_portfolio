import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { AgXToneMapping, Vector2, Vector3 } from 'three'
import {
  Center,
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useVideoTexture,
  useGLTF,
} from '@react-three/drei'

const SCREEN_URL = 'https://yash5800.github.io/portfolio_OS/'
// The `screen` quad is 1.7673 x 1.0435 world units, so 1280 CSS px across keeps
// the page crisp: drei maps 1 CSS px to distanceFactor / 400 world units.
const SCREEN_PX_WIDTH = 1280
const SCREEN_SURFACE_OFFSET = 0.004
// Below this on-screen width the page is too small to use, so the canvas keeps
// the pointer (orbit / zoom) and a click flies the camera to the monitor.
const INTERACTIVE_WIDTH_PX = 420
const FOCUS_MOVE_SECONDS = 0.9


const CAMERA_SETTINGS = {
  position: [9.09711936781742, -7.22382386526061, 9.541201816412357],
  fov: 45,
}
const GL_SETTINGS = { toneMapping: AgXToneMapping }
const CONTROLS_TARGET = [-1.5158713875146357, -12.189464979138682, -1.4339594202211259]
// Framing manually selected from the scene logs for the screen focus view.
const SCREEN_FOCUS_POSITION = [
  -0.6020393054329886,
  -10.810775920423039,
  -0.9425945731522214,
]
const SCREEN_FOCUS_TARGET = [
  -0.6065286179771302,
  -10.8431843024839,
  -2.7112279493628226,
]

// Meshes that can sit between the camera and the monitor. Raycasting these is
// cheap (walls, chair, desk, tower, plants) and keeps the page from showing
// through them.
const OCCLUDER_NAMES = [
  'wall_part',
  'room002',
  'room004',
  'chair001',
  'seat001',
  'table001',
  'pc',
  'pc_glass',
  'keyboard',
  'lamp001',
  'plant1001',
  'plant2001',
  'smallshelf001',
  'floor',
]

function WikipediaPage({ width, height }) {
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

function MonitorVideo({ width, height, position }) {
  const texture = useVideoTexture('/video/ideal.mp4', {
    muted: true,
    loop: true,
    playsInline: true,
  })

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/**
 * Renders the OS site on the `screen` mesh (child of `monitor.001`):
 * an HTML overlay anchored to the quad and projected onto it in 3D.
 */
function OsScreen({ mesh, focusedOnScreen }) {
  const [interactive, setInteractive] = useState(false)
  const wasInteractive = useRef(false)
  const scratch = useMemo(() => ({ center: new Vector3() }), [])

  const geometry = useMemo(() => {
    if (!mesh) return null
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    return {
      width: size.x,
      height: size.y,
      center,
      distanceFactor: (400 * size.x) / SCREEN_PX_WIDTH,
      pxWidth: SCREEN_PX_WIDTH,
      pxHeight: (SCREEN_PX_WIDTH * size.y) / size.x,
    }
  }, [mesh])

  const occluders = useMemo(() => {
    if (!mesh) return undefined
    let root = mesh
    while (root.parent) root = root.parent
    const found = []
    root.traverse((o) => {
      if (o.isMesh && OCCLUDER_NAMES.includes(o.name)) {
        found.push({ current: o })
      }
    })
    return found.length ? found : undefined
  }, [mesh])

  useFrame(({ camera, size }) => {
    if (!mesh || !geometry || !camera.isPerspectiveCamera) return
    mesh.updateWorldMatrix(true, false)
    scratch.center.copy(geometry.center).applyMatrix4(mesh.matrixWorld)
    const distance = camera.position.distanceTo(scratch.center)
    const pxPerUnit =
      size.height / (2 * Math.tan((camera.fov * Math.PI) / 360) * distance)
    const next = geometry.width * pxPerUnit >= INTERACTIVE_WIDTH_PX
    if (next !== wasInteractive.current) {
      wasInteractive.current = next
      setInteractive(next)
    }
  })

  if (!mesh || !geometry) return null

  return createPortal(
    focusedOnScreen ? (
      <Html
        transform
        distanceFactor={geometry.distanceFactor}
        position={[
          geometry.center.x,
          geometry.center.y,
          geometry.center.z + SCREEN_SURFACE_OFFSET,
        ]}
        occlude={occluders}
        pointerEvents={interactive ? 'auto' : 'none'}
        zIndexRange={[20, 0]}
        style={{ width: geometry.pxWidth, height: geometry.pxHeight }}
      >
        <WikipediaPage width={geometry.pxWidth} height={geometry.pxHeight} />
      </Html>
    ) : (
      <MonitorVideo
        width={geometry.width}
        height={geometry.height}
        position={[
          geometry.center.x,
          geometry.center.y,
          geometry.center.z + SCREEN_SURFACE_OFFSET,
        ]}
      />
    ),
    mesh,
  )
}

/**
 * Click the monitor to fly the camera in front of the screen, then use the
 * on-screen page. `focusApi` exposes `exit()` for the back button.
 */
function ScreenFocus({ mesh, focusApi, onFocusChange }) {
  const { camera, controls, gl, raycaster } = useThree()
  const anim = useRef(null)
  const home = useRef(null)
  const focused = useRef(false)

  const animateTo = useCallback(
    (position, target, onDone) => {
      if (!controls) return
      anim.current = {
        t: 0,
        from: camera.position.clone(),
        to: position.clone(),
        fromTarget: controls.target.clone(),
        toTarget: target.clone(),
        onDone,
      }
    },
    [camera, controls],
  )

  useEffect(() => {
    if (!mesh) return
    const el = gl.domElement
    let down = null

    const onPointerDown = (e) => {
      down = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e) => {
      if (e.button !== 0 || !down || focused.current) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      down = null
      if (moved > 6) return

      const rect = el.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      const hits = raycaster.intersectObject(mesh, false)
      console.log('[focus] click', hits.length, 'focused', focused.current, 'home', !!home.current)
      if (!hits.length) return

      home.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      }
      // Lock orbiting/zooming until the user comes back to the room view.
      focused.current = true
      controls.enabled = false
      animateTo(
        new Vector3(...SCREEN_FOCUS_POSITION),
        new Vector3(...SCREEN_FOCUS_TARGET),
        () => onFocusChange(true),
      )
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
    }
  }, [mesh, camera, controls, gl, raycaster, animateTo, onFocusChange])

  const exit = useCallback(() => {
    console.log('[focus] exit requested', !!home.current)
    if (!home.current || !controls) return
    const { position, target } = home.current
    home.current = null
    animateTo(position, target, () => {
      focused.current = false
      controls.enabled = true
      onFocusChange(false)
    })
  }, [animateTo, controls, onFocusChange])

  useEffect(() => {
    if (!focusApi) return
    focusApi.current = { exit }
  }, [focusApi, exit])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exit])

  useFrame((_, delta) => {
    if (!anim.current || !controls) return
    const a = anim.current
    a.t = Math.min(1, a.t + delta / FOCUS_MOVE_SECONDS)
    const eased = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2
    camera.position.lerpVectors(a.from, a.to, eased)
    controls.target.lerpVectors(a.fromTarget, a.toTarget, eased)
    controls.update()
    if (a.t === 1) {
      anim.current = null
      console.log('[focus] anim done', camera.position.toArray().map((v) => v.toFixed(2)))
      a.onDone?.()
    }
  })

  return null
}

function Model({ focusApi, onFocusChange, focusedOnScreen }) {
  const { scene } = useGLTF('/models/portfolio-web.glb')
  const screen = useMemo(() => scene.getObjectByName('screen'), [scene])
  return (
    <>
      <primitive object={scene} />
      <OsScreen mesh={screen} focusedOnScreen={focusedOnScreen} />
      <ScreenFocus
        mesh={screen}
        focusApi={focusApi}
        onFocusChange={onFocusChange}
      />
    </>
  )
}

function CameraLogger() {
  const { camera, controls } = useThree()
  useEffect(() => {
    if (!controls) return
    const log = () =>
      console.log(
        '[camera]',
        camera.position,
        'target:',
        controls.target,
      )
    log()
    controls.addEventListener('change', log)
    return () => controls.removeEventListener('change', log)
  }, [camera, controls])
  return null
}

export default function Scene() {
  const [focusedOnScreen, setFocusedOnScreen] = useState(false)
  const focusApi = useRef(null)

  return (
    <>
      <Canvas
        camera={CAMERA_SETTINGS}
        shadows
        dpr={[1, 2]}
        gl={GL_SETTINGS}
      >
        <Suspense fallback={null}>
          <Center>
            <Model
              focusApi={focusApi}
              onFocusChange={setFocusedOnScreen}
              focusedOnScreen={focusedOnScreen}
            />
          </Center>
          <ContactShadows opacity={0.5} blur={2.5} far={4} resolution={1024} />
          <Environment
            files="/hdri/photo_studio_01_1k.hdr"
            environmentIntensity={1.15}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          // enablePan={false}
          target={CONTROLS_TARGET}
        />
        <CameraLogger />
      </Canvas>
      {focusedOnScreen && (
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
