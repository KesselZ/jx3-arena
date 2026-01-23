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
        const massA = entity.physics?.mass || 1
        const massB = other.physics?.mass || 1
        const totalMass = massA + massB
        
        // 质量越大，被挤开的比例越小 (反比关系)
        const weightA = massB / totalMass 
        const weightB = massA / totalMass
        
        // --- 软碰撞处理：将重叠转化为物理速度 (Velocity) ---
        // 增加动态硬度：如果一方速度极快（被击退中），碰撞硬度临时提高，确保能撞开人
        const velA = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.z ** 2);
        const velB = Math.sqrt(other.velocity.x ** 2 + other.velocity.z ** 2);
        const hardness = 0.5 + Math.max(velA, velB) * 0.1; 
        
        const pushPower = overlap * Math.min(hardness, 5.0); // 封顶硬度，防止数值爆炸
        
        entity.velocity.x -= nx * pushPower * weightA
        entity.velocity.z -= nz * pushPower * weightA
        other.velocity.x += nx * pushPower * weightB
        other.velocity.z += nz * pushPower * weightB

        // --- 新增：动量传递 (保龄球连锁反应) ---
        // 如果 A 正在高速撞向 B，将 A 的一部分速度传给 B
        const rvx = entity.velocity.x - other.velocity.x;
        const rvz = entity.velocity.z - other.velocity.z;
        const velAlongNormal = rvx * nx + rvz * nz;

        if (velAlongNormal > 2.0) {
            const momentumTransfer = 0.6; // 动量传递比例
            const impulse = velAlongNormal * momentumTransfer;
            
            entity.velocity.x -= impulse * nx * weightA;
            entity.velocity.z -= impulse * nz * weightA;
            other.velocity.x += impulse * nx * weightB;
            other.velocity.z += nz * pushPower * weightB; // 注意：这里也需要考虑质量
        }
      }
    }
  }
}
