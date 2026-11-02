import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { AgXToneMapping } from 'three'
import {
  Center,
  ContactShadows,
  Environment,
  OrbitControls,
  useGLTF,
} from '@react-three/drei'

function Model() {
  const { scene } = useGLTF('/models/portfolio-web.glb')
  return <primitive object={scene} />
}

function CameraLogger() {
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

export default function Scene() {
  return (
    <Canvas
      camera={{
        position: [11.788442579378897, -8.702591503197986, 9.489608717608975],
        fov: 45,
      }}
      shadows
      dpr={[1, 2]}
      gl={{ toneMapping: AgXToneMapping }}
    >
      <Suspense fallback={null}>
        <Center>
          <Model />
        </Center>
        <ContactShadows opacity={0.5} blur={2.5} far={4} resolution={1024} />
        <Environment
          files="/hdri/photo_studio_01_1k.hdr"
          environmentIntensity={1.15}
        />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        target={[0.09599018795156955, -10.89963219684369, -0.38748347495744395]}
      />
      <CameraLogger />
    </Canvas>
  )
}
