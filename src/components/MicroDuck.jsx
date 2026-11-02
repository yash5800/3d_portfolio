import { useEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  DUCK_HEIGHT,
  FLOOR_Y,
  createRoamState,
  groundHeightAt,
  stepRoamState,
} from '../utils/duckRoam.js'

const MODEL_URL = `${import.meta.env.BASE_URL}models/microduck.glb`

/** Speed at which the exported walk cycle reads as "planted" (tuned by eye). */
const CLIP_REFERENCE_SPEED = 0.26
/** Keeps the clip from looking frozen or frantic at the extremes. */
const MIN_TIME_SCALE = 0.25
const MAX_TIME_SCALE = 1.8

/**
 * Lowest point the model reaches while the walk cycle plays, in model units.
 *
 * The clip lifts every node off the rest pose (the duck is ~0.25 units higher
 * once the animations are applied), so measuring the loaded pose alone leaves
 * the duck hovering above the floor. Sample the whole cycle on a throwaway copy
 * instead, and drop the model so the planted foot lands at the group origin.
 */
function lowestAnimatedPoint(scene, animations) {
  const probe = scene.clone(true)
  const mixer = new THREE.AnimationMixer(probe)
  const duration = Math.max(...animations.map((clip) => clip.duration), 0)
  if (!duration) return null

  for (const clip of animations) mixer.clipAction(clip, probe).play()

  let lowest = Infinity
  const samples = 24
  for (let i = 0; i < samples; i++) {
    mixer.setTime((duration * i) / samples)
    probe.updateMatrixWorld(true)
    lowest = Math.min(lowest, new THREE.Box3().setFromObject(probe).min.y)
  }

  mixer.stopAllAction()
  return Number.isFinite(lowest) ? lowest : null
}

function makeShadowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.42)')
  gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.22)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * The room's pet: a small low-poly duck that wanders the open floor in front of
 * the desk. Its model, waypoints and floor height live in the room model's own
 * space, so it lines up with the furniture exactly like the overlays do.
 */
export default function MicroDuck({ height = DUCK_HEIGHT, rootRef }) {
  const internalRef = useRef(null)
  const root = rootRef ?? internalRef
  const { scene, animations } = useGLTF(MODEL_URL)

  // Blender exported the walk cycle as one action per node; merging them into a
  // single clip lets every part of the duck animate together.
  const combinedClip = useMemo(() => {
    const tracks = animations.flatMap((clip) => clip.tracks.map((track) => track.clone()))
    return new THREE.AnimationClip('Walk', 2.75, tracks)
  }, [animations])

  const { actions } = useAnimations([combinedClip], root)

  // Centre the model on x/z, drop its feet onto the group origin, then scale to height.
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const factor = height / (size.y || 1)
    const lowest = lowestAnimatedPoint(scene, animations) ?? box.min.y
    return { scale: factor, offset: [-center.x, -lowest, -center.z] }
  }, [scene, animations, height])

  const shadowTexture = useMemo(() => makeShadowTexture(), [])
  const walkAction = useRef(null)
  const roam = useRef(createRoamState())

  useEffect(() => {
    const walk = actions.Walk
    if (!walk) return undefined

    walk.reset()
    walk.setLoop(THREE.LoopRepeat, Infinity)
    walk.clampWhenFinished = false
    walk.play()
    walkAction.current = walk

    return () => {
      walk.stop()
      walkAction.current = null
    }
  }, [actions])

  useFrame((_, delta) => {
    const node = root.current
    if (!node) return

    const duck = roam.current
    const speed = stepRoamState(duck, delta)

    // Feet stay planted on whatever surface is under them (tiles or the mat);
    // the walk cycle does the rest. The height is eased so stepping onto the
    // mat doesn't pop.
    const groundY = groundHeightAt(duck.x, duck.z)
    const easedY = THREE.MathUtils.damp(node.position.y, groundY, 12, Math.min(delta, 0.05))
    node.position.set(duck.x, easedY, duck.z)
    node.rotation.y = duck.yaw

    if (walkAction.current) {
      // Play the cycle at the pace the duck actually travels, so the feet
      // don't skate. Idle keeps a slow shuffle so it still feels alive.
      walkAction.current.timeScale =
        speed > 0.02
          ? THREE.MathUtils.clamp(speed / CLIP_REFERENCE_SPEED, MIN_TIME_SCALE, MAX_TIME_SCALE)
          : MIN_TIME_SCALE
    }
  })

  return (
    <group ref={root} position={[roam.current.x, FLOOR_Y, roam.current.z]}>
      <group scale={scale}>
        <group position={offset}>
          <primitive object={scene} />
        </group>
      </group>
      {/* Soft blob shadow so the duck reads as standing on the tiles while it roams. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={1}>
        <planeGeometry args={[0.78, 0.78]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload(MODEL_URL)
