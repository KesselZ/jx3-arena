import { queries } from '../engine/ecs'
import { spatialHash } from '../engine/spatialHash'

/**
 * collisionSystem: 碰撞系统
 * 职责：
 * 1. 更新空间哈希索引
 * 2. 处理实体间的圆形碰撞挤压
 */
export function collisionSystem() {
  const combatants = queries.combatants.entities
  
  // 1. 重置并更新空间哈希
  spatialHash.clear()
  for (const entity of combatants) {
    spatialHash.insert(entity)
  }

  // 2. 处理碰撞挤压 (Crowd Steering)
  for (const entity of combatants) {
    if (!entity.stats) continue
    
    const x = entity.position.x
    const z = entity.position.z
    const radius = entity.stats.radius
    
    // 查询周围可能碰撞的实体 (查询范围略大于半径)
    const neighbors = spatialHash.query(x, z, radius * 2)
    
    for (const other of neighbors) {
      if (entity === other || !other.stats) continue
      
      const dx = other.position.x - x
      const dz = other.position.z - z
      const distSq = dx * dx + dz * dz
      const minContextDist = radius + other.stats.radius
      const minDistSq = minContextDist * minContextDist
      
      // 检查是否发生重叠 (使用平方比较，避免 Math.sqrt)
      if (distSq < minDistSq) {
        const dist = Math.sqrt(distSq) || 0.0001
        const overlap = minContextDist - dist
        
        // 归一化方向向量
        const nx = dx / dist
        const nz = dz / dist
        
        // 分离力量 (通常各承担一半)
        const force = overlap * 0.5
        
        // 更新位置 (直接挤开)
        entity.position.x -= nx * force
        entity.position.z -= nz * force
        other.position.x += nx * force
        other.position.z += nz * force
      }
    }
  }
}
