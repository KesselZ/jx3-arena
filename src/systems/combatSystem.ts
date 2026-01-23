import * as THREE from 'three';
import { world, Entity, queries } from '../engine/ecs';
import { GAME_CONFIG } from '../game/config';
import { findNearestHostile, findHero } from '../engine/targeting';

/**
 * 战斗系统：负责检测范围并触发攻击逻辑
 */
export const combatSystem = (delta: number) => {
  const currentTime = performance.now() / 1000;
  
  // 1. 遍历所有具有攻击能力的实体
  for (const attacker of world.entities) {
    if (!attacker.attack || attacker.dead) continue;

    // --- 核心逻辑：Burst (连发) 处理 ---
    let canAttack = false;
    const isBursting = (attacker.burstRemaining || 0) > 0;

    if (isBursting) {
      // 连发中：检查连发间隔
      const interval = attacker.attack.burstInterval || 0.1;
      if (currentTime - (attacker.lastBurstTime || 0) >= interval) {
        canAttack = true;
      }
    } else {
      // 非连发：检查基础攻速冷却
      const lastAttack = attacker.lastAttackTime || 0;
      const attackInterval = 1 / attacker.attack.speed;
      if (currentTime - lastAttack >= attackInterval) {
        canAttack = true;
      }
    }

    if (!canAttack) continue;

    // 2. 索敌逻辑优化
    let target: Entity | null = null;
    
    if (attacker.type === 'enemy') {
      // 敌人：强制只找主角，O(1) 性能极速
      target = findHero(attacker);
    } else {
      // 玩家或盟友：寻找最近的敌对目标 (因为数量少，O(n) 搜索完全不影响性能)
      target = findNearestHostile(attacker);
    }

    if (!target) {
      attacker.currentTargetId = undefined;
      continue;
    }

    attacker.currentTargetId = target.id;

    // 3. 距离检测 (边缘到边缘 Edge-to-Edge)
    const dx = target.position.x - attacker.position.x;
    const dz = target.position.z - attacker.position.z;
    const distSq = dx * dx + dz * dz;
    
    // 真实的攻击距离应该是：基础射程 + 攻击者半径 + 目标半径
    const attackerRadius = attacker.stats?.radius || 0;
    const targetRadius = target.stats?.radius || 0;
    const effectiveRange = attacker.attack.range + attackerRadius + targetRadius;
    const rangeSq = effectiveRange * effectiveRange;

    if (distSq <= rangeSq) {
      // 触发攻击！
      performAttack(attacker, target, currentTime);
    }
  }
};

// 性能优化：使用自增 ID 替代昂贵的 crypto.randomUUID()
let effectIdCounter = 0;

const performAttack = (attacker: Entity, target: Entity, time: number) => {
  // ... 之前的状态更新逻辑保持不变 ...
  const isBursting = (attacker.burstRemaining || 0) > 0;
  
  if (isBursting) {
    attacker.burstRemaining! -= 1;
    attacker.lastBurstTime = time;
    if (attacker.burstRemaining === 0) attacker.lastAttackTime = time;
  } else {
    if (attacker.attack!.burst && attacker.attack!.burst > 1) {
      attacker.burstRemaining = attacker.attack!.burst - 1;
      attacker.lastBurstTime = time;
    } else {
      attacker.lastAttackTime = time;
    }
  }

  // 记录攻击方向角
  const adx = target.position.x - attacker.position.x;
  const adz = target.position.z - attacker.position.z;
  const dist = Math.sqrt(adx * adx + adz * adz) || 1;
  const angle = Math.atan2(adx, adz);
  attacker.lastAttackAngle = angle;

  // --- 物理冲量：仅受击者产生位移 ---
  const nx = adx / dist;
  const nz = adz / dist;
  
  // 1. 攻击者不再产生 velocity 增量，保持重心稳固
  // 2. 受击者根据攻击者的 knockback 属性和自身的 mass 产生位移
  const kbPower = attacker.attack!.knockback || 0;
  const targetMass = target.physics?.mass || 1;
  const finalKnockback = kbPower / targetMass;

  target.velocity.x += nx * finalKnockback;
  target.velocity.z += nz * finalKnockback;

  // 2. 伤害应用
  target.health.current -= attacker.attack!.power;
  target.health.lastHitTime = time;

  if (target.health.current <= 0) {
    target.health.current = 0;
    delete target.ai;
    delete target.attack;
    delete target.input;
    target.velocity.x = target.velocity.z = 0;
    target.dead = true;
    target.deathTime = time;

    const ddx = target.position.x - attacker.position.x;
    const ddz = target.position.z - attacker.position.z;
    const ddist = Math.sqrt(ddx * ddx + ddz * ddz) || 1;
    target.deathDir = { x: ddx / ddist, y: 0, z: ddz / ddist };
  }

  // --- 3. 产生特效 (内存优化版：确保属性完整) ---
  const isMelee = attacker.attack!.type === 'melee';
  const duration = isMelee ? 0.3 : 0.8;

  // 显式创建对象，确保所有查询所需的属性都存在
  const effectData: Entity = {
    id: `fx-${effectIdCounter++}`,
    type: 'effect', // 必须有 type 才能被 queries.effects 捕获
    position: { x: attacker.position.x, y: attacker.position.y, z: attacker.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 1, max: 1 },
    lifetime: { remaining: duration },
    effect: {
      type: attacker.attack!.vfxType,
      startTime: time,
      duration: duration, 
      angle: angle, 
      attackerPos: { x: attacker.position.x, y: attacker.position.y, z: attacker.position.z }, 
      targetPos: { x: target.position.x, y: target.position.y, z: target.position.z },
      attackerType: attacker.type as any, 
      length: dist
    }
  };

  world.add(effectData);
};
