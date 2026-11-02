import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

/**
 * Development utility that logs camera position and controls target to the console
 * whenever OrbitControls change.
 */
export default function CameraLogger() {
  const { camera, controls } = useThree()

  useEffect(() => {
    if (!controls) return
    const log = () =>
      console.log(
        '[camera]',
        camera.position,
        'target:',
        controls.target,
      )
    log()
    controls.addEventListener('change', log)
    return () => controls.removeEventListener('change', log)
  }, [camera, controls])

  return null
}
