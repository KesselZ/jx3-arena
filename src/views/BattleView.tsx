import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { BattleScene } from './BattleScene'
import { BattleUI } from './BattleUI'

/**
 * 顶层调度：BattleView
 * 职责：作为粘合剂，将 3D 渲染层和 2D UI 层叠在一起
 * 实现了表现层的彻底解耦
 */
export const BattleView = () => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-jx3-ink">
      {/* 1. 3D 渲染层 (WebGL) */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <Suspense fallback={null}>
            <BattleScene />
          </Suspense>
        </Canvas>
      </div>

      {/* 2. 2D UI 覆盖层 (DOM) */}
      <BattleUI />
    </div>
  )
}
