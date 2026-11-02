import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

export function usePortfolioReady() {
  const active = useProgress((state) => state.active)
  const progress = useProgress((state) => state.progress)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (active || progress < 100) {
      setReady(false)
      return undefined
    }

    const timer = window.setTimeout(() => setReady(true), 650)
    return () => window.clearTimeout(timer)
  }, [active, progress])

  return ready
}
