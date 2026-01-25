import { useEntities } from 'miniplex-react'
import { world, queries } from '../engine/ecs'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../data/config'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'

/**
 * 3D 性能数据采集器 (Canvas 内部组件)
 */
const TIME_CONSTANT = 0.8; // 平滑时间常数

export function PerformanceMonitor() {
  const lastUpdateTime = useRef(performance.now())
  const frameCount = useRef(0)
  const smoothed = useRef<any>(null)
  const { gl } = useThree()
  
  const renderStartTime = useRef(0)

  useEffect(() => {
    const originalAutoReset = gl.info.autoReset
    gl.info.autoReset = false
    return () => { gl.info.autoReset = originalAutoReset }
  }, [gl])

  useFrame((state) => {
    renderStartTime.current = performance.now()
  }, -1)

  useFrame((state, delta) => {
    const now = performance.now()
    const renderTime = now - renderStartTime.current
    
    frameCount.current++
    const metrics = (state as any).perfMetrics || {}
    const logicTime = metrics.total || 0
    const frameTime = delta * 1000
    const idleTime = Math.max(0, frameTime - logicTime - renderTime)
    
    const alpha = 1 - Math.exp(-delta / TIME_CONSTANT);
    
    if (!smoothed.current) {
      smoothed.current = { 
        frameTime, 
        logicTime, 
        renderTime,
        idleTime,
        perfMetrics: { ...metrics } 
      }
    } else {
      const s = smoothed.current;
      s.frameTime += (frameTime - s.frameTime) * alpha;
      s.logicTime += (logicTime - s.logicTime) * alpha;
      s.renderTime += (renderTime - s.renderTime) * alpha;
      s.idleTime += (idleTime - s.idleTime) * alpha;
      
      Object.keys(metrics).forEach(key => {
        if (s.perfMetrics[key] === undefined) s.perfMetrics[key] = metrics[key];
        s.perfMetrics[key] += (metrics[key] - s.perfMetrics[key]) * alpha;
      })
    }

    const timeSinceLastUpdate = now - lastUpdateTime.current
    if (timeSinceLastUpdate >= 500) {
      const fpsValue = Math.round((frameCount.current * 1000) / timeSinceLastUpdate)
      
      const perfData = {
        fps: fpsValue,
        frameTime: smoothed.current.frameTime,
        logicTime: smoothed.current.logicTime,
        renderTime: smoothed.current.renderTime,
        idleTime: smoothed.current.idleTime,
        perfMetrics: { ...smoothed.current.perfMetrics },
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        memory: { geometries: gl.info.memory.geometries, textures: gl.info.memory.textures }
      };
      
      // 触发一个自定义事件，通知外部的 StatsPanel 更新
      window.dispatchEvent(new CustomEvent('perf-update', { detail: perfData }));
      
      lastUpdateTime.current = now
      frameCount.current = 0
    }
    
    gl.info.reset()
  }, 1000)

  return null
}

/**
 * 性能监测面板 (Canvas 外部：监听自定义事件更新 DOM)
 */
function StatsPanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (!containerRef.current || !GAME_CONFIG.DEBUG) return
      const perf = e.detail
      
      const getMetricColor = (val: number) => {
        if (val > 2) return '#ff4d4f'
        if (val > 1) return '#fbbf24'
        return '#d4af37'
      }

      const metrics = perf.perfMetrics || {}
      const entitiesCount = world.entities.length

      containerRef.current.innerHTML = `
        <div class="pixel-panel !p-3 bg-jx3-ink/80 border-jx3-gold !text-[9px] text-jx3-gold font-mono leading-tight shadow-2xl min-w-[180px]" style="border: 2px solid #d4af37; background: rgba(26, 26, 26, 0.8); padding: 12px; color: #d4af37; font-family: monospace;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid rgba(212, 175, 55, 0.2); padding-bottom: 4px;">
            <span style="opacity: 0.7; font-weight: bold;">PERFORMANCE PRO (DOM)</span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between;">
              <span>FPS</span>
              <span style="color: ${perf.fps < 30 ? '#ff4d4f' : '#d4af37'}">${perf.fps}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Frame</span>
              <span>${perf.frameTime.toFixed(2)}ms</span>
            </div>
            
            <div style="margin: 4px 0; border-top: 1px solid rgba(212, 175, 55, 0.1);"></div>

            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Logic</span>
              <span style="color: ${perf.logicTime > 10 ? '#ff4d4f' : '#d4af37'}">${perf.logicTime.toFixed(2)}ms</span>
            </div>
            
            <div style="padding-left: 8px; border-left: 1px solid rgba(212, 175, 55, 0.2); font-size: 8px; opacity: 0.8;">
              <div style="display: flex; justify-content: space-between;"><span>Input</span><span style="color: ${getMetricColor(metrics.input)}">${(metrics.input || 0).toFixed(2)}ms</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Hash</span><span style="color: ${getMetricColor(metrics.hash)}">${(metrics.hash || 0).toFixed(2)}ms</span></div>
              <div style="display: flex; justify-content: space-between;"><span>AI</span><span style="color: ${getMetricColor(metrics.ai)}">${(metrics.ai || 0).toFixed(2)}ms</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Combat</span><span style="color: ${getMetricColor(metrics.combat)}">${(metrics.combat || 0).toFixed(2)}ms</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Movement</span><span style="color: ${getMetricColor(metrics.movement)}">${(metrics.movement || 0).toFixed(2)}ms</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Collision</span><span style="color: ${getMetricColor(metrics.collision)}">${(metrics.collision || 0).toFixed(2)}ms</span></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 4px;">
              <span>Render</span>
              <span style="color: ${perf.renderTime > 5 ? '#ff4d4f' : '#d4af37'}">${perf.renderTime.toFixed(2)}ms</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; opacity: 0.6; font-size: 8px;">
              <span>Idle/Jank</span>
              <span>${perf.idleTime.toFixed(2)}ms</span>
            </div>

            <div style="margin: 4px 0; border-top: 1px solid rgba(212, 175, 55, 0.1);"></div>
            
            <div style="display: flex; justify-content: space-between;">
              <span>DrawCalls</span>
              <span style="color: white;">${perf.drawCalls}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Triangles</span>
              <span style="color: white;">${(perf.triangles / 1000).toFixed(1)}k</span>
            </div>
            
            <div style="margin: 4px 0; border-top: 1px solid rgba(212, 175, 55, 0.1);"></div>

            <div style="display: flex; justify-content: space-between; opacity: 0.8;">
              <span>Geo/Tex</span>
              <span>${perf.memory.geometries}/${perf.memory.textures}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Entities</span>
              <span style="color: #d4af37; font-weight: bold;">${entitiesCount}</span>
            </div>
          </div>
        </div>
      `
    }

    window.addEventListener('perf-update', handleUpdate)
    return () => window.removeEventListener('perf-update', handleUpdate)
  }, [])

  if (!GAME_CONFIG.DEBUG) return null

  return (
    <div ref={containerRef} className="absolute bottom-4 right-4 z-50 pointer-events-none" />
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
  const waveTimer = useGameStore((state) => state.waveTimer)
  const gold = useGameStore((state) => state.gold)
  
  // 1. 初始获取玩家实体
  const { entities } = useEntities(queries.players)
  const player = entities[0]

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between text-jx3-gold">
      {/* 顶部：波次与回营 */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex gap-4">
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

          <div className="pixel-panel border-jx3-gold !bg-jx3-ink !text-jx3-gold flex flex-col justify-center items-center min-w-[100px]">
            <div className="text-[10px] opacity-70 uppercase tracking-wider">第 {wave} 波</div>
            <div className="text-2xl font-bold font-mono">
              {Math.ceil(waveTimer)}s
            </div>
          </div>

          <div className="pixel-panel border-jx3-gold !bg-jx3-ink !text-jx3-gold flex flex-col justify-center items-center min-w-[80px]">
            <div className="text-[10px] opacity-70 uppercase tracking-wider">金钱</div>
            <div className="text-xl font-bold text-yellow-400">
              {gold}
            </div>
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
