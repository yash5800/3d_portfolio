import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Euler, Quaternion } from 'three'
import { CYBERTV_FLOAT } from '../config/sceneConfig.js'

/** Height of the secondary ripple relative to the main bob. */
const HARMONIC = 0.35
/** Ratio between the ripple and bob frequencies, deliberately non-integer. */
const HARMONIC_SPEED = 2.37

/**
 * Gives the cybertv robot its idle float: a slow vertical hover, a lazy drift
 * and a gentle tilt, all layered from out-of-phase sine waves so the motion
 * never snaps back to a visible loop. The robot also leans a touch toward the
 * cursor, which keeps it feeling weightless instead of pre-scripted.
 *
 * The node is animated in place (never re-parented), so raycasting, the camera
 * focus rig and the model's authored transform all keep working untouched.
 *
 * @param {object} props
 * @param {import('three').Group} props.scene - Full 3D scene group holding `cybertv`
 */
export default function CyberTvFloat({ scene }) {
  const node = useMemo(() => scene.getObjectByName('cybertv'), [scene])
  /** Authored transform, so every frame is an offset from the artist's pose. */
  const rest = useRef(null)
  /** Scratch objects, reused each frame to keep the loop allocation-free. */
  const tilt = useRef(new Euler())
  const lean = useRef(new Quaternion())
  const cursorLean = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!node) {
      console.warn('cybertv node not found; float animation skipped')
      return
    }
    rest.current = {
      position: node.position.clone(),
      quaternion: node.quaternion.clone(),
    }
  }, [node])

  useFrame(({ clock, pointer }, delta) => {
    const origin = rest.current
    if (!node || !origin) return

    const t = clock.elapsedTime
    const f = CYBERTV_FLOAT

    // Ease the cursor lean so fast mouse moves never jolt the robot.
    const follow = 1 - Math.exp(-delta * f.leanDamping)
    cursorLean.current.x += (pointer.x - cursorLean.current.x) * follow
    cursorLean.current.y += (pointer.y - cursorLean.current.y) * follow

    const lift =
      Math.sin(t * f.bobSpeed) * f.bob +
      Math.sin(t * f.bobSpeed * HARMONIC_SPEED + 1.7) * f.bob * HARMONIC
    const driftX = Math.sin(t * f.driftSpeed + 0.6) * f.drift
    const driftZ = Math.sin(t * f.driftSpeed * 0.73 + 2.4) * f.drift * 0.8

    node.position.set(
      origin.position.x + driftX,
      origin.position.y + lift,
      origin.position.z + driftZ,
    )

    tilt.current.set(
      Math.sin(t * f.tiltSpeed * 0.91 + 2.1) * f.tiltX - cursorLean.current.y * f.pointerLean,
      Math.sin(t * f.tiltSpeed * 0.83 + 0.4) * f.tiltY + cursorLean.current.x * f.pointerLean,
      Math.sin(t * f.tiltSpeed * 1.13 + 3.4) * f.tiltZ,
    )
    node.quaternion
      .copy(origin.quaternion)
      .multiply(lean.current.setFromEuler(tilt.current))
  })

  return null
}
