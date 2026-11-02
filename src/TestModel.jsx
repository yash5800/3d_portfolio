
import { useEffect } from 'react'
import * as THREE from 'three'
import { useGLTF, useVideoTexture } from '@react-three/drei'

function FramesVideoReplacer({ scene }) {
  const texture = useVideoTexture('/video/pocker.mp4', {
    muted: true,
    loop: true,
    start: true,
    playsInline: true,
  })

  useEffect(() => {
    const frameNames = [
      'frame1001',
      'frame2001',
      'frame3001',
      'frame4001',
    ]

    const originals = []
    const videoTextures = []

    frameNames.forEach((name) => {
      const frame = scene.getObjectByName(name)

      if (!frame?.isMesh) {
        console.warn('Frame not found:', name)
        return
      }

      const uv = frame.geometry.attributes.uv

      if (!uv) {
        console.warn('No UV coordinates:', name)
        return
      }

      // Find this frame's UV boundaries
      const bounds = new THREE.Box2()

      for (let i = 0; i < uv.count; i++) {
        bounds.expandByPoint(
          new THREE.Vector2(
            uv.getX(i),
            uv.getY(i)
          )
        )
      }

      const uvSize = new THREE.Vector2()
      bounds.getSize(uvSize)

      const center = new THREE.Vector2()
      bounds.getCenter(center)

      // Create an independent texture using the same video
      const videoTexture = new THREE.VideoTexture(texture.image)

      videoTexture.center.set(center.x, center.y)

      // Normalize UV differences and preserve your zoom
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
      videoTexture.needsUpdate = true

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

      console.log('Normalized frame:', name, {
        uvSize,
        center,
      })
    })

    return () => {
      originals.forEach(({ frame, material }) => {
        frame.material = material
      })

      videoTextures.forEach((t) => t.dispose())
    }
  }, [scene, texture])

  return null
}

export default function TestModel() {
  const { scene } = useGLTF('/models/portfolio.glb')

  return (
    <>
      <primitive object={scene} />
      <VideoReplacer scene={scene} />
    </>
  )
}
