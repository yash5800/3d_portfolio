import { useEffect } from 'react'
import {
  BufferAttribute,
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three'
import {
  CLOCK_TEXTURE_HEIGHT,
  CLOCK_TEXTURE_WIDTH,
  VISITOR_PLACEHOLDER,
  drawClock,
} from '../utils/cyberTvClock.js'
import { fetchVisitorCount } from '../utils/visitorCount.js'
import { VISITOR_COUNT_REFRESH_MS } from '../config/sceneConfig.js'

/** The cybertv's glass; glTF loader rewrites `tvscreen.001` to `tvscreen_001`. */
const SCREEN_PREFIX = 'tvscreen'

/**
 * @param {import('three').Group} scene
 * @returns {import('three').Mesh | null}
 */
function findScreen(scene) {
  let found = null
  scene.traverse((object) => {
    if (!found && object.isMesh && object.name.startsWith(SCREEN_PREFIX)) {
      found = object
    }
  })
  return found
}

/**
 * Paints a live pixel clock onto the cybertv's curved glass.
 *
 * The screen is swapped to an unlit texture so it reads as a glowing CRT in the
 * lit room. The face repaints twice a second (the colon blinks each second) and
 * keeps a GoatCounter visitor total refreshed every five minutes.
 *
 * @param {object} props
 * @param {import('three').Group} props.scene - Full 3D scene group holding `tvscreen`
 */
export default function CyberTvClock({ scene }) {
  useEffect(() => {
    const mesh = findScreen(scene)
    if (!mesh) {
      console.warn('tvscreen mesh not found; cybertv clock skipped')
      return undefined
    }

    const canvas = document.createElement('canvas')
    canvas.width = CLOCK_TEXTURE_WIDTH
    canvas.height = CLOCK_TEXTURE_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter

    // The exported glass ships without UVs, so project them across its local
    // YZ plane. The screen faces local +X, where local -Z is screen-right.
    const geometry = mesh.geometry
    let addedUv = false
    if (!geometry.getAttribute('uv')) {
      geometry.computeBoundingBox()
      const bounds = geometry.boundingBox
      const size = bounds.getSize(new Vector3())
      const position = geometry.getAttribute('position')
      const uv = new Float32Array(position.count * 2)
      for (let i = 0; i < position.count; i++) {
        uv[i * 2] = (bounds.max.z - position.getZ(i)) / (size.z || 1)
        uv[i * 2 + 1] = (position.getY(i) - bounds.min.y) / (size.y || 1)
      }
      geometry.setAttribute('uv', new BufferAttribute(uv, 2))
      addedUv = true
    }

    const originalMaterial = mesh.material
    const material = new MeshBasicMaterial({
      map: texture,
      side: DoubleSide,
      toneMapped: false,
    })
    mesh.material = material

    let visitors = VISITOR_PLACEHOLDER
    const paint = () => {
      const now = new Date()
      drawClock(ctx, now, now.getSeconds() % 2 === 0, visitors)
      texture.needsUpdate = true
    }
    paint()
    const timer = window.setInterval(paint, 500)

    const counter = new AbortController()
    const loadVisitors = async () => {
      try {
        visitors = await fetchVisitorCount(counter.signal)
        paint()
      } catch (error) {
        if (error.name === 'AbortError') return
        console.warn('Visitor count unavailable:', error.message)
      }
    }
    loadVisitors()
    const refresh = window.setInterval(loadVisitors, VISITOR_COUNT_REFRESH_MS)

    return () => {
      window.clearInterval(timer)
      window.clearInterval(refresh)
      counter.abort()
      mesh.material = originalMaterial
      material.dispose()
      texture.dispose()
      if (addedUv) geometry.deleteAttribute('uv')
    }
  }, [scene])

  return null
}
