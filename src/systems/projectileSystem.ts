import * as THREE from 'three'
import { world, queries, Entity, entityMap, spawnDamageText } from '../engine/ecs'
import { spatialHash } from '../engine/spatialHash'
import { GAME_CONFIG } from '../data/config'
import { AudioAssets, SoundPriority } from '../assets/audioAssets'

import { COMBAT_STYLES } from '../data/combatConfig'

const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _forward = new THREE.Vector3(0, 0, 1)

/**
 * ProjectileSystem: 弹道逻辑大脑
 * 职责：处理所有弹道的位移、追踪、碰撞检测和穿透逻辑
 * 返回细分耗时数据
 */
export function projectileSystem(dt: number) {
  const projectiles = queries.projectiles.entities
  let moveTime = 0
  let hitTime = 0

  for (let i = 0; i < projectiles.length; i++) {
    const entity = projectiles[i]
    const p = entity.projectile!

    // 1. 生命周期管理
    p.lifeTime -= dt
    if (p.lifeTime <= 0) {
      world.remove(entity)
      continue
    }

    const tStart = performance.now()

    // 2. 追踪逻辑 (使用 entityMap 优化查找性能 O(1))
    if (p.targetId) {
      const target = entityMap.get(p.targetId)
      if (target && !target.dead) {
        // 简单的转向逻辑：向目标位置插值
        _v1.set(target.position.x, target.position.y + 1, target.position.z)
        _v2.set(entity.position.x, entity.position.y, entity.position.z)
        const dirToTarget = _v1.sub(_v2).normalize()
        
        // 将当前速度向目标方向偏移 (追踪力度)
        const currentDir = _v2.set(entity.velocity.x, entity.velocity.y, entity.velocity.z).normalize()
        currentDir.lerp(dirToTarget, 0.1) // 0.1 是追踪灵敏度
        
        entity.velocity.x = currentDir.x * p.speed
        entity.velocity.y = currentDir.y * p.speed
        entity.velocity.z = currentDir.z * p.speed
      }
    }

    // 3. 更新物理位移
    entity.position.x += entity.velocity.x * dt
    entity.position.y += entity.velocity.y * dt
    entity.position.z += entity.velocity.z * dt

    // 4. 更新逻辑朝向
    _v1.set(entity.velocity.x, entity.velocity.y, entity.velocity.z).normalize()
    _quat.setFromUnitVectors(_forward, _v1)
    if (!entity.quaternion) {
      entity.quaternion = { x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }
    } else {
      entity.quaternion.x = _quat.x
      entity.quaternion.y = _quat.y
      entity.quaternion.z = _quat.z
      entity.quaternion.w = _quat.w
    }

    const tMid = performance.now()
    moveTime += (tMid - tStart)

    // 5. 碰撞检测 (恢复：每 2 帧检测一次，错开执行)
    const shouldCheck = (world.entities.length + i) % 2 === 0

    if (shouldCheck) {
      // 优化：减小查询半径，从 1.0 降至 0.7 (略大于判定半径 0.6)
      const nearby = spatialHash.query(entity.position.x, entity.position.z, 0.7)
      
      // 优化：将 owner 阵营判断提取到循环外（已在 i 循环内）
      const owner = entityMap.get(p.ownerId)
      const isOwnerFriendly = owner ? (owner.type === 'player' || owner.type === 'ally') : false

      for (let j = 0; j < nearby.length; j++) {
        const target = nearby[j]
        
        if (target.id === p.ownerId || p.hitEntities.has(target.id)) continue
        if (target.dead || !target.health) continue

        const isTargetFriendly = target.type === 'player' || target.type === 'ally'
        if (isOwnerFriendly === isTargetFriendly) continue 

        const distSq = (target.position.x - entity.position.x) ** 2 + 
                       (target.position.z - entity.position.z) ** 2
        
        if (distSq < 0.6 * 0.6) {
          applyProjectileHit(entity, target)
          
          p.pierce--
          p.hitEntities.add(target.id)
          
          if (p.pierce < 0) {
            world.remove(entity)
            break 
          }
        }
      }
    }
    hitTime += (performance.now() - tMid)
  }

  return { moveTime, hitTime }
}

/**
 * 应用弹道命中效果
 */
function applyProjectileHit(projectile: Entity, target: Entity) {
  const p = projectile.projectile!
  const style = COMBAT_STYLES[p.styleId]; // 核心：读取声明式的风格配置
  
  // 1. 扣血
  if (target.health) {
    const damage = p.damage;
    target.health.current -= damage
    target.health.lastHitTime = performance.now() / 1000
    
    // 只有敌人掉血才触发伤害飘字
    if (target.type === 'enemy') {
      spawnDamageText(damage, target.position);
    }

    // 播放受击音效 (声明式：使用 Style 定义的 hit 音效)
    const hitPriority = target.type === 'player' ? SoundPriority.CRITICAL : SoundPriority.NORMAL;
    const hitSoundId = style?.sfx.hit || 'HIT_BODY';
    
    AudioAssets.play(hitSoundId, { 
      position: target.position, 
      priority: hitPriority,
      sourceType: target.type as any
    });
    
    if (target.health.current <= 0 && !target.dead) {
      target.dead = true
      target.deathTime = performance.now() / 1000
      target.deathDir = { 
        x: projectile.velocity.x * 0.2, 
        y: 0.5, 
        z: projectile.velocity.z * 0.2 
      }
    }
  }

  // 2. 击退 (冲量)
  // 核心修改：主角 (player) 不受击退影响
  if (target.velocity && target.type !== 'player') {
    const knockbackMult = 2.0
    target.velocity.x += (projectile.velocity.x / p.speed) * knockbackMult
    target.velocity.z += (projectile.velocity.z / p.speed) * knockbackMult
  }
}
