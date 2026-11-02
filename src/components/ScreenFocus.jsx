import { useCallback, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector2, Vector3 } from 'three'
import {
  animateCamera,
  calculateFrameFocus,
  findAncestor,
  sleepControls,
  wakeControls,
} from '../animations/cameraAnimations.js'
import { endActiveSquish, endSquish, startSquish } from '../animations/hoverSquish.js'
import {
  FOCUS_MOVE_SECONDS,
  GITHUB_URL,
  LINKEDIN_URL,
  SCREEN_FOCUS_POSITION,
  SCREEN_FOCUS_TARGET,
} from '../config/sceneConfig.js'
import { playActionSound, playHoverSquish } from '../utils/audio.js'

/** Objects that squash-pop on hover, keyed by the same prefixed names as the click logic. */
const SQUISH_PATTERN = /^(sframe\d|plant\d|buds|mouse\b|keyboard|rex)|linkedin|github/i

/** The mouse pad; it covers the desk mouse, so squish looks past it. */
const MOUSE_PAD_PATTERN = /^mousemate/i

/**
 * Handles all click-to-focus camera animations, external link redirection,
 * hover cursor updates, and back-to-home transitions.
 *
 * @param {object} props
 * @param {import('three').Mesh} props.mesh - Screen quad mesh
 * @param {import('three').Group} props.scene - Full 3D scene group
 * @param {React.MutableRefObject} props.duckRef - Group holding the roaming micro duck
 * @param {React.MutableRefObject} props.focusApi - Ref exposing exit() for UI buttons
 * @param {Function} props.onFocusChange - Callback when focus target changes ('screen' | 'frame' | null)
 */
export default function ScreenFocus({ mesh, scene, duckRef, focusApi, onFocusChange, onRexClick, onRexHover }) {
  const { camera, controls, gl, raycaster } = useThree()

  /** The squish node the cursor is currently over, or null. */
  const hoveredSquish = useRef(null)
  /** The duck is its own glTF primitive, so it needs to be raycast alongside the room. */
  const isDuckPart = (object) => {
    const duck = duckRef?.current
    if (!duck) return false
    for (let node = object; node; node = node.parent) {
      if (node === duck) return true
    }
    return false
  }

  const tween = useRef(null)
  const suspended = useRef(null)
  const home = useRef(null)
  const zoomWhoosh = useRef(null)

  // null | 'screen' | 'frame' — which zoom target currently has the camera
  const focused = useRef(null)
  const zoomedFrame = useRef(null)

  // Wrapper around animateCamera that manages controls suspension
  const animateTo = useCallback(
    (position, target, onDone) => {
      if (!controls) return
      if (!suspended.current) {
        suspended.current = sleepControls(controls)
      }
      tween.current?.kill()

      tween.current = animateCamera({
        camera,
        controls,
        position,
        target,
        onDone: () => {
          tween.current = null
          wakeControls(controls, suspended.current)
          suspended.current = null
          onDone?.()
        },
      })
    },
    [camera, controls],
  )

  const focusScreen = useCallback(() => {
    if (!mesh || !controls || focused.current) return

    home.current = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    }
    focused.current = 'screen'
    controls.enabled = false
    // Squish is a room-view flourish, so anything popped must deflate on zoom.
    endActiveSquish()
    hoveredSquish.current = null

    window.clearTimeout(zoomWhoosh.current)
    zoomWhoosh.current = window.setTimeout(
      () => playActionSound('zoomIn'),
      (FOCUS_MOVE_SECONDS * 1000) / 2,
    )

    animateTo(
      new Vector3(...SCREEN_FOCUS_POSITION),
      new Vector3(...SCREEN_FOCUS_TARGET),
      () => onFocusChange('screen'),
    )
  }, [animateTo, camera, controls, mesh, onFocusChange])

  // Clean up any active tweens on unmount
  useEffect(() => {
    return () => {
      tween.current?.kill()
      window.clearTimeout(zoomWhoosh.current)
      endActiveSquish()
      hoveredSquish.current = null
      if (suspended.current) {
        wakeControls(controls, suspended.current)
        suspended.current = null
      }
    }
  }, [controls])

  // Click & pointer interaction listener
  useEffect(() => {
    if (!mesh) return
    const el = gl.domElement
    let down = null

    const onPointerDown = (e) => {
      down = { x: e.clientX, y: e.clientY }
    }

    const onPointerUp = (e) => {
      if (e.button !== 0 || !down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      down = null
      // Avoid triggering click during camera drag/orbit
      if (moved > 6) return

      const rect = el.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )

      const targets = scene ? [scene] : mesh ? [mesh] : []
      if (duckRef?.current) targets.push(duckRef.current)
      const hits = targets.length
        ? raycaster.intersectObjects(targets, true)
        : []
      const hit = hits[0] ?? null

      const isScreen = !!hit && (hit.object === mesh || hit.object.parent === mesh)
      const sframeNode = hit ? findAncestor(hit.object, /^sframe\d/i) : null
      const linkedinNode = hit ? findAncestor(hit.object, /linkedin/i) : null
      const githubNode = hit ? findAncestor(hit.object, /github/i) : null

      // External profile link redirects in new tab
      if (linkedinNode) {
        window.open(LINKEDIN_URL, '_blank')
        return
      }
      if (githubNode) {
        window.open(GITHUB_URL, '_blank')
        return
      }

      // The duck says its piece; it is not a zoom target.
      if (hit && isDuckPart(hit.object)) {
        playActionSound('duck')
        return
      }

      // If already zoomed in, clicking outside exits zoom back to room view
      if (focused.current) {
        const onTarget =
          focused.current === 'screen'
            ? isScreen
            : sframeNode === zoomedFrame.current
        if (!onTarget) exit()
        return
      }

      if (!hit) return

      // Clicking the desk mouse or keyboard plays its own recorded sound
      const mouseNode = findAncestor(hit.object, /^mouse/i)
      const keyboardNode = findAncestor(hit.object, /^keyboard/i)
      const rexNode = findAncestor(hit.object, /^rex/i)
      if (mouseNode) playActionSound('mouse')
      if (keyboardNode) playActionSound('keyboard')
      // The rex figure speaks its ordered clips, then the fallback forever.
      if (rexNode) onRexClick?.()
      if (isScreen) {
        focusScreen()
        return
      }
      if (!sframeNode) return

      // Save home camera state to restore on exit
      home.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
      }

      // Lock standard orbit controls while zoomed
      focused.current = 'frame'
      controls.enabled = false
      // The clicked frame may be squished: deflate it while the camera moves in.
      endActiveSquish()
      hoveredSquish.current = null

      // Whoosh part-way through the move, where the camera is fastest.
      window.clearTimeout(zoomWhoosh.current)
      zoomWhoosh.current = window.setTimeout(
        () => playActionSound('zoomIn'),
        (FOCUS_MOVE_SECONDS * 1000) / 2,
      )

      const frame = sframeNode
      zoomedFrame.current = frame
      const { position, target } = calculateFrameFocus({ frame, camera })
      animateTo(position, target, () => onFocusChange('frame'))
    }

    // Update cursor styling on hover over interactive 3D elements
    const onPointerMove = (e) => {
      const rect = el.getBoundingClientRect()
      raycaster.setFromCamera(
        new Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      const targets = scene ? [scene] : mesh ? [mesh] : []
      if (duckRef?.current) targets.push(duckRef.current)
      const hits = targets.length
        ? raycaster.intersectObjects(targets, true)
        : []
      const hit = hits[0] ?? null
      if (!hit) {
        onRexHover?.(false)
        endActiveSquish()
        hoveredSquish.current = null
        el.style.cursor = 'auto'
        return
      }

      const duckNode = isDuckPart(hit.object)

      const isScreen = hit.object === mesh || hit.object.parent === mesh
      const sframeNode = findAncestor(hit.object, /^sframe\d/i)
      const linkedinNode = findAncestor(hit.object, /linkedin/i)
      const githubNode = findAncestor(hit.object, /github/i)
      const mouseNode = findAncestor(hit.object, /^mouse/i)
      const keyboardNode = findAncestor(hit.object, /^keyboard/i)
      const rexNode = findAncestor(hit.object, /^rex/i)
      onRexHover?.(!!rexNode)

      // Squish target for the cursor's ray. The pad often covers the desk
      // mouse from this camera, so when the pad wins the ray we look past it
      // to the nearest squish object underneath instead.
      const resolveSquishNode = (primary, allHits) => {
        if (findAncestor(primary.object, MOUSE_PAD_PATTERN)) {
          for (const deeper of allHits) {
            if (deeper.object === primary.object) continue
            const node = findAncestor(deeper.object, SQUISH_PATTERN)
            if (node) return node
          }
          return null
        }
        return findAncestor(primary.object, SQUISH_PATTERN)
      }
      const squishNode = resolveSquishNode(hit, hits)

      // Hover squish is a room-view flourish: once zoomed in or mid-orbit
      // drag, anything popped deflates and the effect stands down.
      if (focused.current || e.buttons) {
        if (hoveredSquish.current) {
          endSquish(hoveredSquish.current)
          hoveredSquish.current = null
        }
      } else if (squishNode !== hoveredSquish.current) {
        if (hoveredSquish.current) endSquish(hoveredSquish.current)
        hoveredSquish.current = squishNode
        if (squishNode) {
          startSquish(squishNode)
          playHoverSquish()
        }
      }

      el.style.cursor =
        isScreen ||
        squishNode ||
        sframeNode ||
        linkedinNode ||
        githubNode ||
        mouseNode ||
        keyboardNode ||
        rexNode ||
        duckNode
          ? 'pointer'
          : 'auto'
    }

    const onPointerLeave = () => {
      onRexHover?.(false)
      if (hoveredSquish.current) {
        endSquish(hoveredSquish.current)
        hoveredSquish.current = null
      }
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
  }, [mesh, scene, duckRef, camera, controls, gl, raycaster, animateTo, focusScreen, onFocusChange, onRexClick, onRexHover])

  // Returns camera to the original room viewpoint
  const exit = useCallback(() => {
    if (!home.current || !controls) return
    const { position, target } = home.current
    home.current = null
    // A pending zoom-in whoosh must not fire once we are already leaving.
    window.clearTimeout(zoomWhoosh.current)
    playActionSound('zoomOut')
    animateTo(position, target, () => {
      focused.current = null
      zoomedFrame.current = null
      controls.enabled = true
      onFocusChange(null)
    })
  }, [animateTo, controls, onFocusChange])

  // Expose exit method to external UI buttons (via focusApi ref)
  useEffect(() => {
    if (!focusApi) return
    focusApi.current = { exit }
  }, [focusApi, exit])

  // Pressing Escape key returns back to home view
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [exit])

  return null
}
