import React from 'react'
import { useGameStore } from '../store/useGameStore'

export const PauseMenu: React.FC = () => {
  const showPauseMenu = useGameStore((state) => state.showPauseMenu)
  const setPaused = useGameStore((state) => state.setPaused)
  const setShowPauseMenu = useGameStore((state) => state.setShowPauseMenu)
  const setPhase = useGameStore((state) => state.setPhase)

  if (!showPauseMenu) return null

  const handleResume = () => {
    setPaused(false);
    setShowPauseMenu(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border-2 border-jx3-gold p-8 rounded-lg shadow-2xl min-w-[300px] flex flex-col gap-6">
        <h2 className="text-3xl font-bold text-jx3-gold text-center mb-4 tracking-widest">游戏暂停</h2>
        
        <button 
          onClick={handleResume}
          className="w-full py-3 bg-jx3-gold hover:bg-yellow-500 text-black font-bold rounded transition-colors text-xl"
        >
          继续游戏
        </button>

        <button 
          onClick={() => {
            handleResume();
            // 这里可以添加设置界面的逻辑
          }}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-colors text-xl border border-slate-500"
        >
          系统设置
        </button>

        <button 
          onClick={() => {
            if (confirm('确定要退出当前战斗返回主菜单吗？')) {
              handleResume();
              setPhase('LOBBY');
            }
          }}
          className="w-full py-3 bg-red-900 hover:bg-red-800 text-white font-bold rounded transition-colors text-xl border border-red-700"
        >
          退出战斗
        </button>

        <div className="text-slate-400 text-sm text-center mt-4">
          按 <span className="text-jx3-gold font-mono">ESC</span> 键恢复
        </div>
      </div>
    </div>
  )
}
