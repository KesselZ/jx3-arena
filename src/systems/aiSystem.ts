import { world, Entity, queries } from '../engine/ecs'
import { findNearestHostile } from '../engine/targeting'
import { GAME_CONFIG } from '../game/config'

export const aiSystem = (delta: number) => {
  const combatants = queries.combatants.entities

  for (const entity of world.entities) {
    if (!entity.ai || entity.ai.behavior !== 'chase' || !entity.velocity || entity.dead) continue

    // 1. 利用统一的索敌引擎寻找目标
    const nearestTarget = findNearestHostile(entity)

    // 2. 执行追逐逻辑
    if (nearestTarget) {
      const dx = nearestTarget.position.x - entity.position.x
      const dz = nearestTarget.position.z - entity.position.z
      const distSq = dx * dx + dz * dz
      const dist = Math.sqrt(distSq)

      // 保持一定距离 (略小于攻击射程)
      const stopDist = (entity.attack?.range || 1) * 0.8
      
      if (dist > stopDist) {
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
