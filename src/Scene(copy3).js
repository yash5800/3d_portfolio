import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { AgXToneMapping, Box3, Vector2, Vector3 } from 'three'
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
const LINKEDIN_URL = 'https://www.linkedin.com/in/alaparthi-yaswanth-kiran/'
const GITHUB_URL = 'https://github.com/yash5800'
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
// Horizontal orbit limits measured from the left and right camera positions.
const MIN_ORBIT_AZIMUTH = 0.05403868953614546
const MAX_ORBIT_AZIMUTH = 1.5
const MIN_ZOOM_DISTANCE = 1
const MAX_ZOOM_DISTANCE = 18
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

let clickAudioContext
function playClickSound(kind) {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  clickAudioContext ||= new AudioContext()
  if (clickAudioContext.state === 'suspended') clickAudioContext.resume()

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
function ScreenFocus({ mesh, scene, focusApi, onFocusChange }) {
  const { camera, controls, gl, raycaster } = useThree()
  const tween = useRef(null)
  const suspended = useRef(null)
  const home = useRef(null)
  // null | 'screen' | 'frame' — which zoom target currently has the camera.
  const focused = useRef(null)
  const zoomedFrame = useRef(null)

  // While a fly animation runs, lift the orbit limits and clear leftover
  // damping inertia; otherwise controls.update() clamps the tweened camera
  // every frame and the motion sticks.
  const sleepControls = () => {
    if (!controls || suspended.current) return
    suspended.current = {
      minAzimuthAngle: controls.minAzimuthAngle,
      maxAzimuthAngle: controls.maxAzimuthAngle,
      minPolarAngle: controls.minPolarAngle,
      maxPolarAngle: controls.maxPolarAngle,
      minDistance: controls.minDistance,
      maxDistance: controls.maxDistance,
      enableDamping: controls.enableDamping,
    }
    controls.minAzimuthAngle = -Infinity
    controls.maxAzimuthAngle = Infinity
    controls.minPolarAngle = 0
    controls.maxPolarAngle = Math.PI
    controls.minDistance = 0.1
    controls.maxDistance = Infinity
    controls.enableDamping = false
    controls.update()
  }
  const wakeControls = () => {
    if (!controls || !suspended.current) return
    Object.assign(controls, suspended.current)
    suspended.current = null
  }

  const animateTo = useCallback(
    (position, target, onDone) => {
      if (!controls) return
      sleepControls()
      tween.current?.kill()
      const proxy = {
        px: camera.position.x,
        py: camera.position.y,
        pz: camera.position.z,
        tx: controls.target.x,
        ty: controls.target.y,
        tz: controls.target.z,
      }
      tween.current = gsap.to(proxy, {
        px: position.x,
        py: position.y,
        pz: position.z,
        tx: target.x,
        ty: target.y,
        tz: target.z,
        duration: FOCUS_MOVE_SECONDS,
        ease: 'power3.inOut',
        onUpdate: () => {
          camera.position.set(proxy.px, proxy.py, proxy.pz)
          controls.target.set(proxy.tx, proxy.ty, proxy.tz)
          controls.update()
        },
        onComplete: () => {
          tween.current = null
          wakeControls()
          onDone?.()
        },
      })
    },
    [camera, controls],
  )

  useEffect(
    () => () => {
      tween.current?.kill()
      wakeControls()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (!mesh) return
    const el = gl.domElement
    let down = null

    const findAncestor = (start, test) => {
      for (let node = start; node; node = node.parent) {
        if (node.name && test.test(node.name)) return node
      }
      return null
    }

    const onPointerDown = (e) => {
      down = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e) => {
      if (e.button !== 0 || !down) return
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
      const hits = scene
        ? raycaster.intersectObject(scene, true)
        : raycaster.intersectObject(mesh, false)
      const hit = hits[0] ?? null

      const isScreen = !!hit && (hit.object === mesh || hit.object.parent === mesh)
      const sframeNode = hit ? findAncestor(hit.object, /^sframe\d/i) : null
      const linkedinNode = hit ? findAncestor(hit.object, /linkedin/i) : null
      const githubNode = hit ? findAncestor(hit.object, /github/i) : null

      if (linkedinNode) {
        window.open(LINKEDIN_URL, '_blank')
        return
      }
      if (githubNode) {
        window.open(GITHUB_URL, '_blank')
        return
      }

      if (focused.current) {
        // While zoomed, taps that miss the focused target behave like the
        // back button; taps on it are ignored (or resolve inside it).
        const onTarget = focused.current === 'screen' ? isScreen : sframeNode === zoomedFrame.current
        console.log('[focus] tap', 'hit', hit?.object.name ?? 'none', 'onTarget', onTarget, 'kind', focused.current)
        if (!onTarget) exit()
        return
      }

      if (!hit) return

      const hitName = hit.object.name
      const mouseNode = findAncestor(hit.object, /^mouse/i)
      console.log('[focus] click', hits.length, 'hit', hitName, 'focused', focused.current, 'home', !!home.current)
      if (mouseNode) playClickSound('mouse')
      if (!isScreen && !sframeNode) return

      home.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      }
      // Lock orbiting/zooming until the user comes back to the room view.
      focused.current = isScreen ? 'screen' : 'frame'
      controls.enabled = false
      if (isScreen) {
        animateTo(
          new Vector3(...SCREEN_FOCUS_POSITION),
          new Vector3(...SCREEN_FOCUS_TARGET),
          () => onFocusChange('screen'),
        )
      } else {
        const frame = sframeNode
        zoomedFrame.current = frame
        frame.updateWorldMatrix(true, true)
        const bounds = new Box3().setFromObject(frame)
        const target = bounds.getCenter(new Vector3())
        const size = bounds.getSize(new Vector3())
        // The frame's front faces its thinnest axis. Use that axis as the
        // approach direction so the camera ends up looking straight at it.
        const flatAxes = ['x', 'y', 'z'].sort((a, b) => size[b] - size[a])
        const normal = new Vector3()
        normal[flatAxes[2]] = 1
        if (camera.position.clone().sub(target).dot(normal) < 0) normal.negate()
        const flat = Math.max(size[flatAxes[0]], size[flatAxes[1]])
        const distance = Math.max(
          0.8,
          flat / (2 * Math.tan((camera.fov * Math.PI) / 360) * 0.62),
        )
        const position = target.clone().addScaledVector(normal, distance)
        console.log(
          '[focus] frame',
          'center', target.toArray().map((v) => v.toFixed(2)),
          'size', size.toArray().map((v) => v.toFixed(2)),
          'normal', normal.toArray().map((v) => v.toFixed(2)),
          'distance', distance.toFixed(2),
        )
        animateTo(position, target, () => onFocusChange('frame'))
      }
    }

    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      const hits = scene
        ? raycaster.intersectObject(scene, true)
        : raycaster.intersectObject(mesh, false)
      const hit = hits[0] ?? null
      if (!hit) {
        el.style.cursor = 'auto'
        return
      }
      const isScreen = hit.object === mesh || hit.object.parent === mesh
      const sframeNode = findAncestor(hit.object, /^sframe\d/i)
      const linkedinNode = findAncestor(hit.object, /linkedin/i)
      const githubNode = findAncestor(hit.object, /github/i)
      const mouseNode = findAncestor(hit.object, /^mouse/i)

      el.style.cursor =
        isScreen || sframeNode || linkedinNode || githubNode || mouseNode
          ? 'pointer'
          : 'auto'
    }

    const onPointerLeave = () => {
      el.style.cursor = 'auto'
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerleave', onPointerLeave)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.style.cursor = 'auto'
    }
  }, [mesh, scene, camera, controls, gl, raycaster, animateTo, onFocusChange])

  const exit = useCallback(() => {
    console.log('[focus] exit requested', !!home.current)
    if (!home.current || !controls) return
    const { position, target } = home.current
    home.current = null
    animateTo(position, target, () => {
      focused.current = null
      zoomedFrame.current = null
      controls.enabled = true
      onFocusChange(null)
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

  return null
}

function Model({ focusApi, onFocusChange, focusView }) {
  const { scene } = useGLTF('/models/portfolio-web.glb')
  const screen = useMemo(() => scene.getObjectByName('screen'), [scene])
  return (
    <>
      <primitive object={scene} />
      <OsScreen mesh={screen} focusedOnScreen={focusView === 'screen'} />
      <ScreenFocus
        mesh={screen}
        scene={scene}
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
  const [focusView, setFocusView] = useState(null)
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
              onFocusChange={setFocusView}
              focusView={focusView}
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
          target={CONTROLS_TARGET}
          minAzimuthAngle={MIN_ORBIT_AZIMUTH}
          maxAzimuthAngle={MAX_ORBIT_AZIMUTH}
          minDistance={MIN_ZOOM_DISTANCE}
          maxDistance={MAX_ZOOM_DISTANCE}
          maxPolarAngle={Math.PI / 2}
          enablePan={false}
        />
        <CameraLogger />
      </Canvas>
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
