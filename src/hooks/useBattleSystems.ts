import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { inputSystem } from '../systems/inputSystem'
import { spawnSystem } from '../systems/spawnSystem'
import { aiSystem } from '../systems/aiSystem'
import { movementSystem } from '../systems/movementSystem'
import { useGameStore } from '../store/useGameStore'

/**
 * 战斗逻辑系统 Hook
 * 职责：驱动所有 ECS 系统运行，并统计逻辑耗时
 */
export function useBattleSystems(keys: any, currentWave: number) {
  const elapsedTime = useRef(0)

  useFrame((state, delta) => {
    const start = performance.now()
    
    // 更新全局流逝时间
    elapsedTime.current += delta
    
    // 依次运行所有 ECS 系统
    inputSystem(keys.current, state.camera)
    spawnSystem(delta, elapsedTime.current, currentWave)
    aiSystem(delta)
    movementSystem(delta)
    
    // 将逻辑耗时存入 state，供 PerformanceMonitor 观测
    const end = performance.now();
    (state as any).lastLogicDuration = end - start
  })

  return { elapsedTime }
}
