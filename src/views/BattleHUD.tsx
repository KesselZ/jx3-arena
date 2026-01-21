import { useEntities } from 'miniplex-react'
import { world } from '../game/world'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../game/config'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'

/**
 * 3D 性能数据采集器 (Canvas 内部组件)
 */
export function PerformanceMonitor() {
  const updateStats = useGameStore((state) => state.updateStats)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const { gl } = useThree()
  
  // 记录真实的渲染数据快照
  const lastFrameStats = useRef({ calls: 0, triangles: 0 })

  // 关键：禁用渲染器的自动重置，由我们手动控制采集时序
  useEffect(() => {
    const originalAutoReset = gl.info.autoReset
    gl.info.autoReset = false
    return () => { gl.info.autoReset = originalAutoReset }
  }, [gl])

  useFrame((state, delta) => {
    // 1. 此时渲染器尚未开始本帧的绘制，gl.info 中保存的是【上一帧】渲染后的完整结果
    // 我们将其锁定到快照中
    lastFrameStats.current.calls = gl.info.render.calls
    lastFrameStats.current.triangles = gl.info.render.triangles

    // 2. 手动重置统计，为【本帧】即将开始的渲染做准备
    gl.info.reset()

    // 3. 正常的采样逻辑（每秒往 Store 推送一次）
    frameCount.current++
    const now = performance.now()
    if (now - lastTime.current >= 1000) {
      updateStats({
        fps: frameCount.current,
        frameTime: delta * 1000,
        drawCalls: lastFrameStats.current.calls,
        triangles: lastFrameStats.current.triangles,
        logicTime: (state as any).lastLogicDuration || 0,
        memory: {
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures
        }
      })
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null
}

/**
 * 性能监测面板
 */
function StatsPanel() {
  const fps = useGameStore(state => state.fps)
  const frameTime = useGameStore(state => state.frameTime)
  const drawCalls = useGameStore(state => state.drawCalls)
  const triangles = useGameStore(state => state.triangles)
  const logicTime = useGameStore(state => state.logicTime)
  const memory = useGameStore(state => state.memory)
  const selectedCharacter = useGameStore(state => state.selectedCharacter)
  const entities = useEntities(world)

  if (!GAME_CONFIG.DEBUG) return null

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-none">
      <div className="pixel-panel !p-3 bg-jx3-ink/80 border-jx3-gold !text-[10px] text-jx3-gold font-mono leading-tight shadow-2xl min-w-[160px]">
        <div className="flex justify-between gap-4 mb-1 border-b border-jx3-gold/20 pb-1">
          <span className="opacity-70 font-bold">PERFORMANCE DEBUG</span>
        </div>
        
        <div className="space-y-0.5">
          <div className="flex justify-between gap-4">
            <span>FPS</span>
            <span className={fps < 30 ? 'text-jx3-vermilion' : 'text-jx3-gold'}>{fps}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Frame</span>
            <span>{frameTime?.toFixed(2) || 0}ms</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Logic</span>
            <span className={logicTime > 10 ? 'text-jx3-vermilion' : 'text-jx3-gold'}>{logicTime?.toFixed(2) || 0}ms</span>
          </div>
          
          <div className="my-1 border-t border-jx3-gold/10" />
          
          <div className="flex justify-between gap-4">
            <span>DrawCalls</span>
            <span className="text-white">{drawCalls}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Triangles</span>
            <span className="text-white">{(triangles / 1000).toFixed(1)}k</span>
          </div>
          
          <div className="my-1 border-t border-jx3-gold/10" />

          <div className="flex justify-between gap-4 opacity-80">
            <span>Geo/Tex</span>
            <span>{memory.geometries}/{memory.textures}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Entities</span>
            <span className="text-jx3-gold font-bold">{world.entities.length}</span>
          </div>

          <div className="my-1 border-t border-jx3-gold/10" />
          
          <div className="flex justify-between gap-4 text-[8px] italic opacity-60">
            <span>Char ID</span>
            <span>{selectedCharacter || 'NULL'}</span>
          </div>
        </div>

        <div className="mt-1 pt-1 border-t border-jx3-gold/20 opacity-40 text-[8px] text-right">
          DEV MODE
        </div>
      </div>
    </div>
  )
}

/**
 * 战斗界面 UI 覆盖层 (Heads-Up Display)
 */
export function BattleHUD() {
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

      {/* 底部中央：装饰信息 */}
      <div className="flex justify-center mb-10">
        <div className="pixel-panel !py-2 !px-6 bg-jx3-paper border-2 animate-pulse text-sm font-bold text-jx3-ink">
          HD-2D 模式：精英架构，逻辑与表现彻底解耦
        </div>
      </div>

      <StatsPanel />
    </div>
  )
}
