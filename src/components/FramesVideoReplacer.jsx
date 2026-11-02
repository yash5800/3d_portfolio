
import { useEffect } from 'react'
import * as THREE from 'three'
import { useVideoTexture } from '@react-three/drei'

export default function FramesVideoReplacer({ scene, active }) {
  const texture = useVideoTexture(`${import.meta.env.BASE_URL}video/pocker.mp4`, {
    muted: true,
    loop: true,
    start: false,
    playsInline: true,
  })

  useEffect(() => {
    const video = texture.image

    const frameNames = [
      'frame1001',
      'frame2001',
      'frame3001',
      'frame4001',
    ]

    // Stop video and restore posters when Rex isn't speaking
    if (!active) {
      video.pause()
      return
    }

    const originals = []
    const videoTextures = []

    frameNames.forEach((name) => {
      const frame = scene.getObjectByName(name)

      if (!frame?.isMesh) return

      const uv = frame.geometry.attributes.uv
      if (!uv) return

      const bounds = new THREE.Box2()

      for (let i = 0; i < uv.count; i++) {
        bounds.expandByPoint(
          new THREE.Vector2(uv.getX(i), uv.getY(i))
        )
      }

      const uvSize = new THREE.Vector2()
      bounds.getSize(uvSize)

      const center = new THREE.Vector2()
      bounds.getCenter(center)

      const videoTexture = new THREE.VideoTexture(video)

      videoTexture.center.set(center.x, center.y)

      videoTexture.repeat.set(
        1 / uvSize.x,
        1 / uvSize.y
      )

      videoTexture.offset.set(
        0.5 - center.x,
        0.5 - center.y
      )

      videoTexture.rotation = Math.PI
      videoTexture.colorSpace = THREE.SRGBColorSpace

      const material = new THREE.MeshBasicMaterial({
        map: videoTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      })

      originals.push({
        frame,
        material: frame.material,
      })

      videoTextures.push(videoTexture)

      frame.material = material
    })

      // Always restart from the beginning when Rex speaks
      video.pause()
      video.currentTime = 0

      video.play().catch((error) => {
        console.warn('Video playback failed:', error)
      })

    return () => {
      // Stop video
      video.pause()

      // Restore original Blender posters
      originals.forEach(({ frame, material }) => {
        frame.material = material
      })

      // Dispose temporary textures
      videoTextures.forEach((t) => t.dispose())
    }
  }, [scene, texture, active])

  return null
}
