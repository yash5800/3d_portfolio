import { useEffect } from 'react'
import { useVideoTexture } from '@react-three/drei'
import { registerVideo } from '../utils/videoMute.js'

/**
 * Fallback looping video rendered on the PC monitor mesh when not focused.
 *
 * @param {object} props
 * @param {number} props.width - Quad width in 3D world units
 * @param {number} props.height - Quad height in 3D world units
 * @param {number[] | import('three').Vector3} props.position - Quad position in 3D space
 */
export default function MonitorVideo({ width, height, position }) {
  // Created muted so autoplay is allowed; the page-level speaker button
  // controls it afterwards through the shared mute state.
  const texture = useVideoTexture(`${import.meta.env.BASE_URL}video/ideal.mp4`, {
    muted: true,
    loop: true,
    playsInline: true,
  })

  useEffect(() => registerVideo(texture.source.data), [texture])

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
