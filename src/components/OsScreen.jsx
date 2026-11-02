import { useMemo, useRef, useState } from 'react'
import { createPortal, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { Vector3 } from 'three'
import WikipediaPage from './WikipediaPage.jsx'
import MonitorVideo from './MonitorVideo.jsx'
import {
  INTERACTIVE_WIDTH_PX,
  OCCLUDER_NAMES,
  SCREEN_PX_WIDTH,
  SCREEN_SURFACE_OFFSET,
} from '../config/sceneConfig.js'

/**
 * Projects the portfolio OS or video onto the `screen` mesh (child of `monitor.001`):
 * an HTML overlay anchored to the quad and projected onto it in 3D.
 *
 * @param {object} props
 * @param {import('three').Mesh} props.mesh - The monitor screen mesh
 * @param {boolean} props.focusedOnScreen - Whether camera is currently focused on the screen
 */
export default function OsScreen({ mesh, focusedOnScreen }) {
  const [interactive, setInteractive] = useState(false)
  const wasInteractive = useRef(false)
  const scratch = useMemo(() => ({ center: new Vector3() }), [])

  // Calculate screen quad dimensions and distanceFactor for Drei Html
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

  // Collect occluding meshes so 3D HTML does not shine through walls, chair, desk, etc.
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

  // Enable pointer events on the iframe only when screen is large enough in viewport
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
  )}
