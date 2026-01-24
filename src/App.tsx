import React, { useEffect } from 'react'
import { useGameStore } from './store/useGameStore'
import { MainMenuView } from './ui/MainMenuView'
import { BattlePage } from './ui/BattlePage'
import { CharacterSelectView } from './ui/CharacterSelectView'
import { AudioAssets } from './assets/audioAssets'
import * as THREE from 'three'

function App() {
  const phase = useGameStore((state) => state.phase)

  // 全局初始化 AudioListener
  useEffect(() => {
    // 创建一个虚拟相机用于承载全局 UI 的 AudioListener
    const dummyCamera = new THREE.PerspectiveCamera();
    AudioAssets.init(dummyCamera);
  }, []);

  return (
    <div className="w-full h-full bg-black">
      {phase === 'LOBBY' && <MainMenuView />}
      {phase === 'CHARACTER_SELECT' && <CharacterSelectView />}
      {(phase === 'BATTLE' || phase === 'CUTSCENE') && <BattlePage />}
      
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

