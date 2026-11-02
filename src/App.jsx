import { Loader } from '@react-three/drei'
import Scene from './Scene.jsx'
import PortfolioChat from './components/PortfolioChat.jsx'
import { usePortfolioReady } from './hooks/usePortfolioReady.js'

function ReadyChat() {
  const ready = usePortfolioReady()
  return ready ? <PortfolioChat /> : null
}

export default function App() {
  return (
    <div className="viewport">
      <Scene />
      <Loader />
      <ReadyChat />
    </div>
  )
}
