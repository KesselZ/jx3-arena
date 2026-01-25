import { Entity, world } from './ecs'
import { spatialHash, SH_CATEGORY } from './spatialHash'

/**
 * 索敌引擎
 */

// 判定两个阵营是否敌对
export function isHostile(a: Entity['type'], b: Entity['type']): boolean {
  if (a === 'enemy') return b === 'player' || b === 'ally'
  if (a === 'player' || a === 'ally') return b === 'enemy'
  return false
}

/**
 * 寻找主角 (用于特定场景或兼容旧代码)
 */
export function findHero(attacker: Entity): Entity | null {
  if (attacker.type === 'spectator') return null
  const player = world.entities.find(e => e.id === 'player-main')
  if (player && !player.dead && isHostile(attacker.type, player.type)) {
    return player
  }
  return null
}

const QUERY_RESULT_CACHE: Entity[] = []

/**
 * 寻找最近的敌对目标 (空间哈希极致版)
 */
export function findNearestHostile(attacker: Entity): Entity | null {
  const { x, z } = attacker.position
  const faction = attacker.type
  
  // 确定我们要找哪一边 (使用掩码)
  const targetMask = (faction === 'enemy') 
    ? (SH_CATEGORY.PLAYER | SH_CATEGORY.ALLY) 
    : SH_CATEGORY.ENEMY;
  
  // 2. 空间哈希查询 (使用掩码过滤，降低半径至 15m 并允许回退)
  const candidates = spatialHash.query(x, z, 15, targetMask, QUERY_RESULT_CACHE, true)
  
  let nearest: Entity | null = null
  let minDistSq = Infinity

  for (let i = 0; i < candidates.length; i++) {
    const target = candidates[i]
    if (target.dead || target === attacker) continue
    
    // 最终安全检查：必须有血条
    if (!target.health) continue;

    const dx = target.position.x - x
    const dz = target.position.z - z
    const dSq = dx * dx + dz * dz
    if (dSq < minDistSq) {
      minDistSq = dSq
      nearest = target
    }
  }

  return nearest
}
