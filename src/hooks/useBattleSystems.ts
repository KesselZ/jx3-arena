import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { inputSystem } from '../systems/inputSystem'
import { spawnSystem } from '../systems/spawnSystem'
import { aiSystem } from '../systems/aiSystem'
import { movementSystem } from '../systems/movementSystem'
import { combatSystem } from '../systems/combatSystem'
import { projectileSystem } from '../systems/projectileSystem'
import { collisionSystem } from '../systems/collisionSystem'
import { world, queries } from '../engine/ecs'
import { useGameStore } from '../store/useGameStore'
import { spatialHash } from '../engine/spatialHash'

/**
 * 战斗逻辑系统 Hook
 * 职责：驱动所有 ECS 系统运行，并统计逻辑耗时
 */
export function useBattleSystems(keys: any, currentWave: number) {
  const elapsedTime = useRef(0)
  
  // 性能分析数据
  const perfMetrics = useRef<Record<string, number>>({
    input: 0,
    spawn: 0,
    hash: 0,
    ai: 0,
    combat: 0,
    projectile: 0,
    movement: 0,
    collision: 0,
    vfx: 0,
    total: 0
  })

  useFrame((state, delta) => {
    const frameStart = performance.now()
    let t: number
    
    // 更新全局流逝时间
    elapsedTime.current += delta
    
    // 1. Input System
    t = performance.now()
    inputSystem(keys.current, state.camera)
    perfMetrics.current.input = performance.now() - t

    // 2. Spawn System
    t = performance.now()
    spawnSystem(delta, elapsedTime.current, currentWave)
    perfMetrics.current.spawn = performance.now() - t

    // 3. Spatial Hash Update
    t = performance.now()
    const combatants = queries.combatants.entities
    spatialHash.clear()
    for (let i = 0; i < combatants.length; i++) {
      spatialHash.insert(combatants[i])
    }
    perfMetrics.current.hash = performance.now() - t

    // 4. AI System
    t = performance.now()
    aiSystem(delta)
    perfMetrics.current.ai = performance.now() - t

    // 5. Combat System
    t = performance.now()
    combatSystem(delta) 
    perfMetrics.current.combat = performance.now() - t

    // 6. Projectile System (消融实验已结束，此处先注释掉)
    t = performance.now()
    // projectileSystem(delta) 
    perfMetrics.current.projectile = performance.now() - t

    // 7. Movement System
    t = performance.now()
    movementSystem(delta)
    perfMetrics.current.movement = performance.now() - t

    // 8. Collision System
    t = performance.now()
    collisionSystem()
    perfMetrics.current.collision = performance.now() - t

    // 9. VFX Lifecycle
    t = performance.now()
    for (const entity of world.entities) {
      if (entity.lifetime) {
        entity.lifetime.remaining -= delta
        if (entity.lifetime.remaining <= 0) {
          world.remove(entity)
        }
      }
    }
    perfMetrics.current.vfx = performance.now() - t
    
    // 10. 总耗时与状态检查
    const totalEnd = performance.now()
    perfMetrics.current.total = totalEnd - frameStart

    // 将细分数据暴露给 state 供 UI 访问
    ;(state as any).perfMetrics = perfMetrics.current
    
    // 检查玩家是否死亡
    const player = queries.players.first
    if (player && player.dead) {
      const timeSinceDeath = (performance.now() / 1000) - (player.deathTime || 0)
      if (timeSinceDeath > 1.5) { 
        useGameStore.getState().setPhase('GAMEOVER')
      }
    }
  })

  return { elapsedTime }
}
