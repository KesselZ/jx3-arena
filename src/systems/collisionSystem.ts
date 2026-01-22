import { queries } from '../engine/ecs'
import { spatialHash } from '../engine/spatialHash'

const COLLISION_CACHE: any[] = [] // 零分配缓存

/**
 * collisionSystem: 碰撞系统 (SpatialHashV2 优化版)
 * 职责：处理实体间的圆形碰撞挤压 (Crowd Steering)
 * 注意：空间哈希的更新已移至 useBattleSystems 顶层，此处仅负责查询和挤压逻辑
 */
export function collisionSystem() {
  const combatants = queries.combatants.entities
  
  // 处理碰撞挤压
  for (let i = 0; i < combatants.length; i++) {
    const entity = combatants[i]
    if (!entity.stats || entity.dead) continue
    
    const x = entity.position.x
    const z = entity.position.z
    const radius = entity.stats.radius
    
    // 1. 利用空间哈希快速获取邻居 (零分配查询)
    // 碰撞检测通常不需要区分阵营，所以不传 targetSide
    const neighbors = spatialHash.query(x, z, radius * 2, undefined, COLLISION_CACHE)
    
    for (let j = 0; j < neighbors.length; j++) {
      const other = neighbors[j]
      if (entity === other || !other.stats || other.dead) continue
      
      const dx = other.position.x - x
      const dz = other.position.z - z
      const distSq = dx * dx + dz * dz
      const minContextDist = radius + other.stats.radius
      const minDistSq = minContextDist * minContextDist
      
      // 2. 检查是否发生重叠
      if (distSq < minDistSq) {
        const dist = Math.sqrt(distSq) || 0.0001
        const overlap = minContextDist - dist
        
        // 归一化方向向量
        const nx = dx / dist
        const nz = dz / dist
        
        // --- 质量比优化：计算挤压权重 ---
        const massA = entity.stats.mass || 1
        const massB = other.stats.mass || 1
        const totalMass = massA + massB
        
        // 质量越大，被挤开的比例越小 (反比关系)
        const weightA = massB / totalMass 
        const weightB = massA / totalMass
        
        // 更新位置
        entity.position.x -= nx * overlap * weightA
        entity.position.z -= nz * overlap * weightA
        other.position.x += nx * overlap * weightB
        other.position.z += nz * overlap * weightB
      }
    }
  }
}
