import { Entity, queries } from './ecs'
import { spatialHash } from './spatialHash'

/**
 * 索敌引擎
 * 职责：提供高性能、解耦的敌对目标查询逻辑
 */

// 判定两个阵营是否敌对
export function isHostile(a: Entity['type'], b: Entity['type']): boolean {
  if (a === 'enemy') return b === 'player' || b === 'ally'
  if (a === 'player' || a === 'ally') return b === 'enemy'
  return false
}

/**
 * 寻找最近的敌对目标 (基于空间哈希的圈层搜索优化)
 */
export function findNearestHostile(attacker: Entity): Entity | null {
  const { x, z } = attacker.position
  const faction = attacker.type
  
  // 1. 圈层搜索策略：从小到大扩大搜索半径
  // 初始搜索半径，覆盖周围一圈网格
  const step = 2.0 // 对应 VISUAL.GRID_SIZE
  const searchRings = [step * 2, step * 8, step * 20] 
  
  for (const range of searchRings) {
    const candidates = spatialHash.query(x, z, range)
    let nearest: Entity | null = null
    let minDistSq = Infinity

    for (const target of candidates) {
      if (target.dead || target === attacker || !isHostile(faction, target.type)) continue
      
      const dx = target.position.x - x
      const dz = target.position.z - z
      const dSq = dx * dx + dz * dz
      if (dSq < minDistSq) {
        minDistSq = dSq
        nearest = target
      }
    }
    
    // 如果在当前圈层找到了，直接返回，不再向外搜索
    if (nearest) return nearest
  }

  // 2. 兜底策略：如果圈层搜索都没找到，执行全局搜索 (但限制频率或范围)
  // 优化：对于普通怪物，如果 40 米内都没人，可能真的不需要再找了
  // 但为了逻辑严谨，我们保留一个低频的全量扫描
  let globalNearest: Entity | null = null
  let globalMinDistSq = Infinity
  
  const combatants = queries.combatants.entities
  for (let i = 0; i < combatants.length; i++) {
    const target = combatants[i]
    if (target.dead || target === attacker || !isHostile(faction, target.type)) continue
    
    const dx = target.position.x - x
    const dz = target.position.z - z
    const dSq = dx * dx + dz * dz
    if (dSq < globalMinDistSq) {
      globalMinDistSq = dSq
      globalNearest = target
    }
  }

  return globalNearest
}
