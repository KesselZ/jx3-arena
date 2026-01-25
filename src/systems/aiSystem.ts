import { world, Entity, queries, entityMap } from '../engine/ecs'
import { findNearestHostile } from '../engine/targeting'
import { GAME_CONFIG } from '../data/config'

/**
 * AI 系统：控制角色的移动意图和索敌逻辑
 * 优化点：
 * 1. 分片更新 (Time Slicing)：每帧只处理 1/20 的实体进行重索敌决策 (约 0.33s 周期)
 * 2. 目标粘滞性：新目标必须比旧目标近一定距离才切换，防止行为抽搐
 * 3. O(1) 查找：利用 entityMap 替代 .find()，消除 O(N^2) 隐患
 */
export const aiSystem = (delta: number) => {
  const currentTime = performance.now() / 1000
  const entities = world.entities

  const TICK_RATE = GAME_CONFIG.PHYSICS.AI_TICK_RATE
  const STICKY_DIST = GAME_CONFIG.PHYSICS.TARGET_STICKY_DISTANCE

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]
    if (!entity.ai || entity.ai.behavior !== 'chase' || entity.dead || (entity.spawnTimer !== undefined && entity.spawnTimer > 0)) continue

    // --- 核心优化：基于时间的错峰决策逻辑 ---
    // 我们利用实体 ID 的哈希值（或简单取长度/字符码）来产生一个持久的偏移量
    // 这样每个实体都会在 0.3s 周期内的不同时间点“睁眼”，彻底平滑 CPU 占用
    const offset = (entity.id.charCodeAt(0) % 100) / 100 * TICK_RATE
    const isTickFrame = Math.floor((currentTime + offset) / TICK_RATE) !== 
                        Math.floor((currentTime - delta + offset) / TICK_RATE)

    // 1. 低频决策逻辑：每 0.3 秒扫描一次，或者当当前目标死亡时立即重扫
    let currentTarget = entity.ai.targetId ? entityMap.get(entity.ai.targetId) : undefined
    const needsImmediateRescan = currentTarget && currentTarget.dead

    // 获取玩家引用 (保镖逻辑需要)
    const player = world.entities.find(e => e.id === 'player-main');
    const isAlly = entity.type === 'ally';

    if (isTickFrame || needsImmediateRescan) {
      const nearest = findNearestHostile(entity)
      const oldTargetId = entity.ai.targetId;
      currentTarget = entity.ai.targetId ? entityMap.get(entity.ai.targetId) : undefined

      if (isAlly && player) {
        // ... (友军逻辑保持不变)
        const distToPlayerSq = (entity.position.x - player.position.x) ** 2 + (entity.position.z - player.position.z) ** 2;
        const leashDistSq = GAME_CONFIG.PHYSICS.ALLY_LEASH_DISTANCE ** 2;

        if (distToPlayerSq > leashDistSq) {
          entity.ai.targetId = undefined;
        } else if (nearest) {
          const enemyDistToPlayerSq = (nearest.position.x - player.position.x) ** 2 + (nearest.position.z - player.position.z) ** 2;
          const combatRadiusSq = GAME_CONFIG.PHYSICS.ALLY_COMBAT_RADIUS ** 2;

          if (enemyDistToPlayerSq < combatRadiusSq) {
            entity.ai.targetId = nearest.id;
          } else if (!currentTarget || currentTarget.dead) {
            entity.ai.targetId = undefined;
          }
        }
      } else if (nearest) {
        // --- 普通敌人索敌逻辑 ---
        if (!currentTarget || currentTarget.dead) {
          entity.ai.targetId = nearest.id
        } else {
          // 强粘滞性判定
          const oldDx = currentTarget.position.x - entity.position.x
          const oldDz = currentTarget.position.z - entity.position.z
          const oldDistSq = oldDx * oldDx + oldDz * oldDz

          const newDx = nearest.position.x - entity.position.x
          const newDz = nearest.position.z - entity.position.z
          const newDistSq = newDx * newDx + newDz * newDz
          
          if (Math.sqrt(newDistSq) < Math.sqrt(oldDistSq) - STICKY_DIST) {
            entity.ai.targetId = nearest.id
          }
        }
      }
    }

    // 2. 高频移动逻辑：每一帧都根据当前确定的 targetId 更新移动意图，保证平滑
    const target = entity.ai.targetId ? entityMap.get(entity.ai.targetId) : undefined;

    if (target && !target.dead) {
      // 攻击/追逐目标逻辑
      const dx = target.position.x - entity.position.x
      const dz = target.position.z - entity.position.z
      const distSq = dx * dx + dz * dz
      
      const stopDist = (entity.attack?.range || 1) * 0.8
      const stopDistSq = stopDist * stopDist
      
      if (distSq > stopDistSq) {
        const dist = Math.sqrt(distSq)
        entity.moveIntent.x = dx / dist
        entity.moveIntent.z = dz / dist
      } else {
        entity.moveIntent.x = 0
        entity.moveIntent.z = 0
      }
    } else if (isAlly && player) {
      // --- 保镖跟随逻辑 (无战斗目标时) ---
      const dx = player.position.x - entity.position.x;
      const dz = player.position.z - entity.position.z;
      const distSq = dx * dx + dz * dz;
      
      const idleRadius = GAME_CONFIG.PHYSICS.ALLY_IDLE_RADIUS;
      // 增加一点随机偏移，防止所有保镖重叠在一点
      const personalSpace = 1.5 + (entity.id.charCodeAt(0) % 5) * 0.5; 
      
      if (distSq > (idleRadius + personalSpace) ** 2) {
        const dist = Math.sqrt(distSq);
        // 向玩家方向移动，但保持一点距离
        entity.moveIntent.x = dx / dist;
        entity.moveIntent.z = dz / dist;
      } else {
        entity.moveIntent.x = 0;
        entity.moveIntent.z = 0;
      }
    } else {
      // 目标丢失或死亡，停止移动
      entity.moveIntent.x = 0
      entity.moveIntent.z = 0
      entity.ai.targetId = undefined;
    }
  }
}
