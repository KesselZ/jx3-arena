import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import * as THREE from 'three'
import { BattleWorld } from '../scenes/BattleWorld'
import { BattleHUD, PerformanceMonitor } from './BattleHUD'

/**
 * 顶层调度：BattlePage
 * 职责：作为容器，将 3D 世界 (BattleWorld) 和 2D 交互层 (BattleHUD) 结合
 */
export const BattlePage = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-jx3-ink">
      {/* 1. 3D 表现层 (WebGL) */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows={{ type: THREE.BasicShadowMap }}>
          <Suspense fallback={null}>
            <BattleWorld />
            {/* 性能采集插件 */}
            <PerformanceMonitor />
          </Suspense>
        </Canvas>
      </div>

      {/* 2. 2D 交互层 (HUD) */}
      <BattleHUD />
    </div>
  )
}
