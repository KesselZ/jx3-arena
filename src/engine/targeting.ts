import { Entity, world } from './ecs'
import { spatialHash } from './spatialHash'

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
  
  // 确定我们要找哪一边
  // 如果我是敌人，我要找主角或友军 (friendly)
  // 如果我是主角或友军，我要找敌人 (enemy)
  const targetSide = (faction === 'enemy') ? 'friendly' : 'enemy'
  
  // 1. 大黑板先行
  if (targetSide === 'friendly' && spatialHash.totalFriendly === 0) return null
  if (targetSide === 'enemy' && spatialHash.totalEnemy === 0) return null

  // 2. 空间哈希查询
  const candidates = spatialHash.query(x, z, 100, targetSide, QUERY_RESULT_CACHE)
  
  let nearest: Entity | null = null
  let minDistSq = Infinity

  for (let i = 0; i < candidates.length; i++) {
    const target = candidates[i]
    if (target.dead || target === attacker) continue
    
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
