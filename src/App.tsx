import { useGameStore } from './store/useGameStore'
import { MainMenuView } from './views/MainMenuView'
import { BattlePage } from './views/BattlePage'
import { CharacterSelectView } from './views/CharacterSelectView'

function App() {
  const phase = useGameStore((state) => state.phase)

  return (
    <div className="w-full h-full bg-black">
      {phase === 'LOBBY' && <MainMenuView />}
      {phase === 'CHARACTER_SELECT' && <CharacterSelectView />}
      {phase === 'BATTLE' && <BattlePage />}
      
      {/* 预留其他场景 */}
      {phase === 'SHOP' && (
        <div className="flex items-center justify-center h-full text-white">
          <h1 className="text-4xl font-bold">商店界面 (开发中)</h1>
          <button 
            onClick={() => useGameStore.getState().setPhase('BATTLE')}
            className="ml-4 px-4 py-2 bg-jx3-gold text-black rounded"
          >
            下一波
          </button>
        </div>
      )}
    </div>
  )
}

export default App

