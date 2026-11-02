import gsap from 'gsap'
import { Box3, Vector3 } from 'three'
import { FOCUS_MOVE_SECONDS } from '../config/sceneConfig.js'

/**
 * While a fly animation runs, lift the orbit limits and clear leftover
 * damping inertia; otherwise controls.update() clamps the tweened camera
 * every frame and the motion sticks.
 *
 * @param {import('three-stdlib').OrbitControls} controls
 * @returns {object} The suspended controls configuration to restore later
 */
export function sleepControls(controls) {
  if (!controls) return null

  const suspended = {
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

  return suspended
}

/**
 * Restores original OrbitControls configuration after camera fly completes.
 *
 * @param {import('three-stdlib').OrbitControls} controls
 * @param {object} suspendedState - Saved state from sleepControls
 */
export function wakeControls(controls, suspendedState) {
  if (!controls || !suspendedState) return
  Object.assign(controls, suspendedState)
}

/**
 * Animates the camera position and orbit controls target smoothly using GSAP.
 *
 * @param {object} options
 * @param {import('three').PerspectiveCamera} options.camera
 * @param {import('three-stdlib').OrbitControls} options.controls
 * @param {import('three').Vector3} options.position - Target camera position
 * @param {import('three').Vector3} options.target - Target controls focal point
 * @param {number} [options.duration] - Animation duration in seconds
 * @param {Function} [options.onDone] - Callback fired when animation finishes
 * @returns {gsap.core.Tween} The GSAP tween instance
 */
export function animateCamera({
  camera,
  controls,
  position,
  target,
  duration = FOCUS_MOVE_SECONDS,
  onDone,
}) {
  if (!controls || !camera) return null

  const proxy = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  }

  return gsap.to(proxy, {
    px: position.x,
    py: position.y,
    pz: position.z,
    tx: target.x,
    ty: target.y,
    tz: target.z,
    duration,
    ease: 'power3.inOut',
    onUpdate: () => {
      camera.position.set(proxy.px, proxy.py, proxy.pz)
      controls.target.set(proxy.tx, proxy.ty, proxy.tz)
      controls.update()
    },
    onComplete: () => {
      onDone?.()
    },
  })
}

/**
 * Calculates optimal camera position and target to view a picture frame straight-on.
 * Determines the frame's face orientation using its thinnest bounding-box axis.
 *
 * @param {object} options
 * @param {import('three').Object3D} options.frame - The frame object in the scene
 * @param {import('three').PerspectiveCamera} options.camera - The active scene camera
 * @returns {{ position: import('three').Vector3, target: import('three').Vector3 }}
 */
export function calculateFrameFocus({ frame, camera }) {
  frame.updateWorldMatrix(true, true)
  const bounds = new Box3().setFromObject(frame)
  const target = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())

  // The frame's front faces its thinnest axis. Use that axis as the
  // approach direction so the camera ends up looking straight at it.
  const flatAxes = ['x', 'y', 'z'].sort((a, b) => size[b] - size[a])
  const normal = new Vector3()
  normal[flatAxes[2]] = 1

  // Point the normal towards the camera if it's currently facing away
  if (camera.position.clone().sub(target).dot(normal) < 0) {
    normal.negate()
  }

  const flat = Math.max(size[flatAxes[0]], size[flatAxes[1]])
  const distance = Math.max(
    0.8,
    flat / (2 * Math.tan((camera.fov * Math.PI) / 360) * 0.62),
  )

  const position = target.clone().addScaledVector(normal, distance)

  return { position, target }
}

/**
 * Traverses up the scene graph hierarchy from `start` to find the first ancestor
 * whose name satisfies the given regular expression.
 *
 * @param {import('three').Object3D} start
 * @param {RegExp} test
 * @returns {import('three').Object3D | null}
 */
export function findAncestor(start, test) {
  for (let node = start; node; node = node.parent) {
    if (node.name && test.test(node.name)) return node
  }
  return null
}
