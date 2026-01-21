import { world, Entity, queries } from '../game/world'
import { GAME_CONFIG } from '../game/config'

export const aiSystem = (delta: number) => {
  const combatants = queries.combatants.entities

  for (const entity of world.entities) {
    if (!entity.ai || entity.ai.behavior !== 'chase' || !entity.velocity || entity.dead) continue

    // 1. 确定阵营关系
    const isEnemyFaction = entity.type === 'enemy'
    
    // 2. 寻找最近的合法目标
    let nearestTarget: Entity | null = null
    let minDistSq = Infinity

    for (const potential of combatants) {
      if (potential.dead || potential === entity) continue
      
      // 判定是否为敌对阵营
      const isPotentialEnemy = isEnemyFaction 
        ? (potential.type === 'player' || potential.type === 'ally')
        : (potential.type === 'enemy')

      if (!isPotentialEnemy) continue
      
      const dx = potential.position.x - entity.position.x
      const dz = potential.position.z - entity.position.z
      const distSq = dx * dx + dz * dz
      
      if (distSq < minDistSq) {
        minDistSq = distSq
        nearestTarget = potential
      }
    }

    // 3. 执行追逐逻辑
    if (nearestTarget) {
      const dx = nearestTarget.position.x - entity.position.x
      const dz = nearestTarget.position.z - entity.position.z
      const dist = Math.sqrt(minDistSq)

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
