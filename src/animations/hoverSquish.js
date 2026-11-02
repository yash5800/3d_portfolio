import gsap from 'gsap'

/** Peak size a squished object inflates to while hovered. */
const HOVER_SCALE = 1.06
/** Temporary squeeze before popping into the hover size. */
const SQUASH_SCALE = { xz: 1.03, y: 0.92 }
/** Seconds per phase of the hover motion. */
const SQUASH_SECONDS = 0.09
const POP_SECONDS = 0.4
const REST_SECONDS = 0.35

/**
 * Resting scale of every object that has ever been squished, so they always
 * return to exactly where the model authored them (some nodes ship scaled).
 */
const restScales = new WeakMap()

/** The single node currently inflated by the cursor, or null. */
let current = null

/**
 * @param {import('three').Object3D} node
 * @returns {{ x: number, y: number, z: number }}
 */
function getRestScale(node) {
  let scale = restScales.get(node)
  if (!scale) {
    scale = { x: node.scale.x, y: node.scale.y, z: node.scale.z }
    restScales.set(node, scale)
  }
  return scale
}

/**
 * Squash-pops one object under the cursor: a quick squeeze, then an
 * elastic overshoot into the hover size.
 *
 * @param {import('three').Object3D} node - Squish target (named ancestor)
 */
export function startSquish(node) {
  if (!node || current === node) return
  if (current) endSquish(current)
  current = node

  gsap.killTweensOf(node.scale)
  const rest = getRestScale(node)

  gsap.to(node.scale, {
    x: rest.x * SQUASH_SCALE.xz,
    y: rest.y * SQUASH_SCALE.y,
    z: rest.z * SQUASH_SCALE.xz,
    duration: SQUASH_SECONDS,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(node.scale, {
        x: rest.x * HOVER_SCALE,
        y: rest.y * HOVER_SCALE,
        z: rest.z * HOVER_SCALE,
        duration: POP_SECONDS,
        ease: 'elastic.out(1, 0.5)',
      })
    },
  })
}

/**
 * Deflates one object back to its resting scale.
 *
 * @param {import('three').Object3D} node - Squish target (named ancestor)
 */
export function endSquish(node) {
  if (!node) return
  gsap.killTweensOf(node.scale)
  if (current === node) current = null

  const rest = getRestScale(node)
  gsap.to(node.scale, {
    x: rest.x,
    y: rest.y,
    z: rest.z,
    duration: REST_SECONDS,
    ease: 'power2.out',
  })
}

/** Ends whatever object is currently squished, if any. */
export function endActiveSquish() {
  if (current) endSquish(current)
}
