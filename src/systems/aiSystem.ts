import { world, Entity, queries } from '../engine/ecs'
import { findNearestHostile } from '../engine/targeting'
import { GAME_CONFIG } from '../game/config'

let aiFrameCounter = 0

/**
 * AI 系统：控制怪物的移动行为
 * 优化点：分片更新 (Time Slicing)，每帧只处理 1/3 的实体
 */
export const aiSystem = (delta: number) => {
  const entities = world.entities
  aiFrameCounter++

  // 设定索敌分片：每 10 帧为一个周期，错开更新
  const TICK_CYCLE = 10

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (!entity.ai || entity.ai.behavior !== 'chase' || !entity.velocity || entity.dead) continue

    // 1. 低频索敌逻辑：只有到了自己的“节奏点”才更新目标 ID
    // 利用 (aiFrameCounter + i) 让不同实体的更新时机均匀分布
    if ((aiFrameCounter + i) % TICK_CYCLE === 0) {
      const nearestTarget = findNearestHostile(entity);
      entity.ai.targetId = nearestTarget?.id;
    }

    // 2. 高频移动逻辑：每一帧都根据当前目标更新速度，保证移动平滑
    let target: Entity | undefined;
    if (entity.ai.targetId) {
      // 优化：先尝试从 queries 里的 combatants 找，比全局 find 快
      target = queries.combatants.entities.find(e => e.id === entity.ai.targetId);
    }

    if (target && !target.dead) {
      const dx = target.position.x - entity.position.x
      const dz = target.position.z - entity.position.z
      const distSq = dx * dx + dz * dz
      
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
      // 如果目标丢失（死亡或超出范围），清除目标 ID，等待下一个 TICK 重新索敌
      entity.ai.targetId = undefined;
    }
  }
}
