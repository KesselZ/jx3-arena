import { useEntities } from 'miniplex-react'
import { world, queries } from '../engine/ecs'
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
    // 1. 此时渲染器尚未开始本帧的绘制，gl.info 中保存的是【前一帧】渲染后的完整结果
    // 注意：我们必须在 gl.info.reset() 之前读取这些数据
    const currentDrawCalls = gl.info.render.calls
    const currentTriangles = gl.info.render.triangles
    const currentGeometries = gl.info.memory.geometries
    const currentTextures = gl.info.memory.textures

    // 2. 采样并推送数据到全局 Store (每秒更新一次 UI)
    frameCount.current++
    const now = performance.now()
    if (now - lastTime.current >= 1000) {
      updateStats({
        fps: frameCount.current,
        frameTime: delta * 1000,
        drawCalls: currentDrawCalls, // 使用实时抓取的数值
        triangles: currentTriangles,
        logicTime: (state as any).perfMetrics?.total || 0,
        perfMetrics: (state as any).perfMetrics,
        memory: {
          geometries: currentGeometries,
          textures: currentTextures
        }
      })
      frameCount.current = 0
      lastTime.current = now
    }
    
    // 3. 重要：手动重置统计，为【本帧】接下来的绘制做准备
    // 这样 gl.info.render.calls 就会从 0 开始重新计数本帧的绘制
    gl.info.reset()
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
  const perfMetrics = useGameStore(state => state.perfMetrics)
  const selectedCharacter = useGameStore(state => state.selectedCharacter)
  const entities = useEntities(world)

  if (!GAME_CONFIG.DEBUG) return null

  const getMetricColor = (val: number) => {
    if (val > 2) return 'text-jx3-vermilion'
    if (val > 1) return 'text-orange-400'
    return 'text-jx3-gold'
  }

  return (
    <div className="absolute bottom-4 right-4 z-50 pointer-events-none">
      <div className="pixel-panel !p-3 bg-jx3-ink/80 border-jx3-gold !text-[9px] text-jx3-gold font-mono leading-tight shadow-2xl min-w-[180px]">
        <div className="flex justify-between gap-4 mb-1 border-b border-jx3-gold/20 pb-1">
          <span className="opacity-70 font-bold">PERFORMANCE PRO</span>
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
          <div className="flex justify-between gap-4 font-bold border-b border-jx3-gold/10 pb-0.5 mb-1">
            <span>Logic Total</span>
            <span className={logicTime > 10 ? 'text-jx3-vermilion' : 'text-jx3-gold'}>{logicTime?.toFixed(2) || 0}ms</span>
          </div>
          
          {perfMetrics && (
            <div className="space-y-0 text-[8px] opacity-80">
              <div className="flex justify-between"><span>├ Input</span><span className={getMetricColor(perfMetrics.input)}>{perfMetrics.input.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>├ Hash</span><span className={getMetricColor(perfMetrics.hash)}>{perfMetrics.hash.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>├ AI</span><span className={getMetricColor(perfMetrics.ai)}>{perfMetrics.ai.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>├ Combat</span><span className={getMetricColor(perfMetrics.combat)}>{perfMetrics.combat.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>├ Projectile</span><span className={getMetricColor(perfMetrics.projectile)}>{perfMetrics.projectile.toFixed(2)}ms</span></div>
              <div className="flex justify-between text-[7px] opacity-60"><span>│  ├ Move</span><span>{perfMetrics.projMove?.toFixed(2)}ms</span></div>
              <div className="flex justify-between text-[7px] opacity-60"><span>│  └ Hit</span><span>{perfMetrics.projHit?.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>├ Movement</span><span className={getMetricColor(perfMetrics.movement)}>{perfMetrics.movement.toFixed(2)}ms</span></div>
              <div className="flex justify-between"><span>└ Collision</span><span className={getMetricColor(perfMetrics.collision)}>{perfMetrics.collision.toFixed(2)}ms</span></div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}

/**
 * 核心：血量同步逻辑 (Canvas 内部组件)
 * 职责：在 useFrame 中每帧同步数据到外部 DOM 元素
 */
export function HealthSync({ player, barRef, textRef }: { player: any, barRef: React.RefObject<HTMLDivElement>, textRef: React.RefObject<HTMLSpanElement> }) {
  useFrame(() => {
    if (!player || !player.health || !barRef.current || !textRef.current) return
    
    const current = player.health.current
    const max = player.health.max
    const percent = Math.max(0, (current / max) * 100)
    
    // 直接操作 DOM 样式，性能最优
    barRef.current.style.width = `${percent}%`
    textRef.current.innerText = `${Math.ceil(current)} / ${max}`
  })
  return null
}

/**
 * 战斗界面 UI 覆盖层 (Heads-Up Display)
 */
export function BattleHUD({ barRef, textRef }: { barRef: React.RefObject<HTMLDivElement>, textRef: React.RefObject<HTMLSpanElement> }) {
  const setPhase = useGameStore((state) => state.setPhase)
  const wave = useGameStore((state) => state.wave)
  
  // 1. 初始获取玩家实体
  const { entities } = useEntities(queries.players)
  const player = entities[0]

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between text-jx3-gold">
      {/* 顶部：波次与回营 */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="pixel-panel border-jx3-gold !bg-jx3-ink !text-jx3-gold">
          <h2 className="font-bold tracking-tighter">
            {player?.unitId ? `侠士: ${player.unitId}` : '准备战斗'}
          </h2>
          <div className="w-48 h-4 bg-jx3-wood border-2 border-jx3-ink mt-2 relative overflow-hidden">
            <div 
              ref={barRef}
              className="h-full bg-jx3-vermilion transition-all duration-100 ease-out" 
              style={{ width: '0%' }} 
            ></div>
          </div>
          <div className="text-[10px] mt-1 opacity-70 flex justify-between">
            <span>气血值</span>
            <span ref={textRef}>0 / 0</span>
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
