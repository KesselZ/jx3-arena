import { Canvas } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { BattleWorld } from '../scenes/BattleWorld'
import { BattleHUD, PerformanceMonitor, HealthSync } from './BattleHUD'
import { DialogueView } from './DialogueView'
import { ShopView } from './ShopView'
import { useEntities } from 'miniplex-react'
import { queries } from '../engine/ecs'
import { useGameStore } from '../store/useGameStore'

/**
 * 顶层调度：BattlePage
 * 职责：作为容器，将 3D 世界 (BattleWorld) 和 2D 交互层 (BattleHUD) 结合
 */
export const BattlePage = () => {
  const barRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const { entities } = useEntities(queries.players)
  const player = entities[0]
  const phase = useGameStore(state => state.phase)

  return (
    <div className="w-full h-full relative overflow-hidden bg-jx3-ink">
      {/* 1. 3D 表现层 (WebGL) */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows={{ type: THREE.BasicShadowMap }}>
          <Suspense fallback={null}>
            <BattleWorld />
            {/* 性能采集插件 */}
            <PerformanceMonitor />
            {/* 血量同步逻辑 (必须在 Canvas 内部) */}
            <HealthSync player={player} barRef={barRef} textRef={textRef} />
          </Suspense>
        </Canvas>
      </div>

      {/* 2. 2D 交互层 (HUD / Dialogue / Shop) */}
      {phase === 'CUTSCENE' && <DialogueView />}
      <ShopView />
      {phase !== 'CUTSCENE' && (
        <BattleHUD barRef={barRef} textRef={textRef} />
      )}
    </div>
  )
}
