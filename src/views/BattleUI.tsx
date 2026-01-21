import { useEntities } from 'miniplex-react'
import { world } from '../game/world'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../game/config'

/**
 * 性能监测面板
 */
function StatsPanel() {
  // 核心修复：原子化订阅，避免返回新对象导致的死循环
  const fps = useGameStore(state => state.fps)
  const frameTime = useGameStore(state => state.frameTime)
  const entities = useEntities(world)

  if (!GAME_CONFIG.DEBUG) return null

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-none">
      <div className="pixel-panel !p-3 bg-jx3-ink/80 border-jx3-gold !text-[10px] text-jx3-gold font-mono leading-tight shadow-2xl">
        <div className="flex justify-between gap-4 mb-1 border-b border-jx3-gold/20 pb-1">
          <span className="opacity-70">PERFORMANCE</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>FPS</span>
          <span className={fps < 30 ? 'text-jx3-vermilion' : 'text-jx3-gold'}>{fps}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Entities</span>
          <span>{entities.length}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Frame</span>
          <span>{frameTime?.toFixed(2) || 0}ms</span>
        </div>
        <div className="mt-1 pt-1 border-t border-jx3-gold/20 opacity-40 text-[8px] text-right">
          DEV MODE
        </div>
      </div>
    </div>
  )
}

/**
 * 战斗界面 UI 遮罩层
 */
export function BattleUI() {
  const setPhase = useGameStore((state) => state.setPhase)
  const wave = useGameStore((state) => state.wave)

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between text-jx3-gold">
      {/* 顶部：波次与回营 */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="pixel-panel border-jx3-gold !bg-jx3-ink !text-jx3-gold">
          <h2 className="font-bold tracking-tighter">第 {wave} 波</h2>
          <div className="w-48 h-4 bg-jx3-wood border-2 border-jx3-ink mt-2 relative overflow-hidden">
            <div className="h-full bg-jx3-vermilion" style={{ width: '80%' }}></div>
          </div>
        </div>
        <button 
          onClick={() => setPhase('LOBBY')}
          className="px-4 py-2 bg-jx3-paper text-jx3-ink font-bold border-b-4 border-r-4 border-jx3-ink hover:bg-white active:translate-x-[2px] active:translate-y-[2px] active:border-b-0 active:border-r-0 transition-all"
        >
          回营
        </button>
      </div>

      {/* 底部：装饰信息 */}
      <div className="flex justify-center mb-10">
        <div className="pixel-panel !py-2 !px-6 bg-jx3-paper border-2 animate-pulse text-sm font-bold text-jx3-ink">
          HD-2D 模式：精英架构，逻辑与表现彻底解耦
        </div>
      </div>

      <StatsPanel />
    </div>
  )
}
