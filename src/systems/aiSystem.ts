import { world, Entity, queries } from '../engine/ecs'
import { findNearestHostile, findHero } from '../engine/targeting'
import { GAME_CONFIG } from '../game/config'

let aiFrameCounter = 0

/**
 * AI 系统：控制怪物的移动行为
 * 优化点：分片更新 (Time Slicing)，每帧只处理 1/3 的实体
 */
export const aiSystem = (delta: number) => {
  const entities = world.entities
  aiFrameCounter++

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (!entity.ai || entity.ai.behavior !== 'chase' || !entity.velocity || entity.dead) continue

    // 性能优化：分片更新 AI (每 3 帧更新一次，且不同实体错开)
    // 这样 500 个实体在每一帧只需要处理约 166 个
    if ((i + aiFrameCounter) % 3 !== 0) continue

    // 1. 消融实验：使用极简的 findHero 替代 findNearestHostile
    const nearestTarget = findHero(entity)

    // 2. 执行追逐逻辑
    if (nearestTarget) {
      const dx = nearestTarget.position.x - entity.position.x
      const dz = nearestTarget.position.z - entity.position.z
      const distSq = dx * dx + dz * dz
      
      // 保持一定距离 (略小于攻击射程)
      const stopDist = (entity.attack?.range || 1) * 0.8
      const stopDistSq = stopDist * stopDist
      
      if (distSq > stopDistSq) {
        const dist = Math.sqrt(distSq)
        const speed = entity.stats?.baseSpeed || 1.5
        entity.velocity.x = (dx / dist) * speed
        entity.velocity.z = (dz / dist) * speed
      } else {
        entity.velocity.x = 0
        entity.velocity.z = 0
      }
    } else {
      entity.velocity.x = 0
      entity.velocity.z = 0
    }
  }
}
