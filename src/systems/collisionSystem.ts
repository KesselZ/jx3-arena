import { queries } from '../engine/ecs'
import { spatialHash, SH_CATEGORY } from '../engine/spatialHash'
import { GAME_CONFIG } from '../data/config'

const COLLISION_CACHE: any[] = [] // 零分配缓存
const COMBATANT_MASK = SH_CATEGORY.PLAYER | SH_CATEGORY.ENEMY | SH_CATEGORY.ALLY;

/**
 * collisionSystem: 碰撞系统 (SpatialHashV2 优化版)
 * 职责：处理实体间的圆形碰撞挤压 (Crowd Steering)
 * 注意：空间哈希的更新已移至 useBattleSystems 顶层，此处仅负责查询和挤压逻辑
 */
export function collisionSystem() {
  const combatants = queries.combatants.entities
  // 使用稳定的时间戳步进作为帧计数器
  const frameCounter = Math.floor(performance.now() / 16); 
  
    // 处理碰撞挤压
    for (let i = 0; i < combatants.length; i++) {
      const entity = combatants[i] as any; // 临时绕过类型检查
      if (!entity.stats || entity.dead || (entity.spawnTimer !== undefined && entity.spawnTimer > 0)) continue
    
    // 1. 分帧优化 (C)：每 5 帧处理一次该实体的碰撞查询，平摊 CPU 压力
    // 利用循环索引和帧计数器错开执行
    if ((i + frameCounter) % 5 !== 0) continue;

    const x = entity.position.x
    const z = entity.position.z
    const radius = entity.stats.radius
    
    // 2. 利用空间哈希快速获取邻居 (使用掩码仅获取战斗员)
    // 此时 neighbors 已经是经过空间哈希和 SIMD 坐标池过滤后的精确结果
    const neighbors = spatialHash.query(x, z, radius * 2, COMBATANT_MASK, COLLISION_CACHE)
    
    for (let j = 0; j < neighbors.length; j++) {
      const other = neighbors[j]
      if (entity === other || !other.stats || other.dead) continue
      
      // 3. 对称剪枝 (A)：确保每对实体只计算一次碰撞，消除 50% 重复计算
      if (entity.id <= other.id) continue;

      const dx = other.position.x - x
      const dz = other.position.z - z
      const distSq = dx * dx + dz * dz
      const minContextDist = radius + other.stats.radius
      const minDistSq = minContextDist * minContextDist
      
      // 4. 检查是否发生重叠
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
        const velA = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.z ** 2);
        const velB = Math.sqrt(other.velocity.x ** 2 + other.velocity.z ** 2);
        
        // 补偿系数：由于分帧导致受力频率降至 1/5，显著提高硬度 (3.0倍)
        const hardness = (GAME_CONFIG.PHYSICS.COLLISION_HARDNESS + Math.max(velA, velB) * 0.1) * 3.0; 
        
        const pushPower = overlap * Math.min(hardness, 12.0); 
        
        entity.velocity.x -= nx * pushPower * weightA
        entity.velocity.z -= nz * pushPower * weightA
        other.velocity.x += nx * pushPower * weightB
        other.velocity.z += nz * pushPower * weightB

        // --- 动量传递 (保龄球连锁反应) ---
        const rvx = entity.velocity.x - other.velocity.x;
        const rvz = entity.velocity.z - other.velocity.z;
        const velAlongNormal = rvx * nx + rvz * nz;

        if (velAlongNormal > 2.0) {
            const momentumTransfer = GAME_CONFIG.PHYSICS.MOMENTUM_TRANSFER * 1.5; // 增强动量感以补偿频率
            const impulse = velAlongNormal * momentumTransfer;
            
            entity.velocity.x -= impulse * nx * weightA;
            entity.velocity.z -= impulse * nz * weightA;
            other.velocity.x += impulse * nx * weightB;
            other.velocity.z += impulse * nz * weightB; 
        }
      }
    }
  }
}
