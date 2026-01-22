import * as THREE from 'three';
import { world, Entity, queries } from '../engine/ecs';
import { GAME_CONFIG } from '../game/config';
import { findNearestHostile } from '../engine/targeting';

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

    // 2. 寻找目标
    let target: Entity | null = null;

    // 优先尝试锁定旧目标 (增加目标粘性)
    if (attacker.currentTargetId) {
      const prevTarget = world.entities.find(e => e.id === attacker.currentTargetId);
      if (prevTarget && !prevTarget.dead) {
        const pdx = prevTarget.position.x - attacker.position.x;
        const pdz = prevTarget.position.z - attacker.position.z;
        const pDistSq = pdx * pdx + pdz * pdz;
        
        // 粘性距离判定 (也考虑 Edge-to-Edge)
        const aRad = attacker.stats?.radius || 0;
        const tRad = prevTarget.stats?.radius || 0;
        const stickyRange = (attacker.attack.range + aRad + tRad) * GAME_CONFIG.BATTLE.TARGET_STICKY_MULT;
        
        if (pDistSq <= stickyRange * stickyRange) {
          target = prevTarget;
        }
      }
    }

    if (!target) {
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

const performAttack = (attacker: Entity, target: Entity, time: number) => {
  // 1. 更新攻击状态 (Burst 状态机)
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
  attacker.lastAttackAngle = Math.atan2(adx, adz);

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
    const dist = Math.sqrt(ddx * ddx + ddz * ddz) || 1;
    target.deathDir = { x: ddx / dist, y: 0, z: ddz / dist };
  }

  // --- 3. 产生特效 (逻辑层只提供语义化的上下文) ---
  const isMelee = attacker.attack!.type === 'melee';
  const dx = target.position.x - attacker.position.x;
  const dz = target.position.z - attacker.position.z;
  const angle = Math.atan2(dx, dz); 

  world.add({
    id: crypto.randomUUID(),
    type: 'effect',
    position: { ...attacker.position },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 1, max: 1 },
    // 移除了冗余的 lifetime 组件，生命周期完全由 VFXLibrary 组件自管理
    effect: {
      type: attacker.attack!.vfxType,
      startTime: time,
      duration: isMelee ? 0.3 : 0.8, 
      angle, 
      attackerPos: { ...attacker.position }, 
      targetPos: { ...target.position },
      attackerType: attacker.type as any, 
      length: Math.sqrt(dx * dx + dz * dz)
    }
  });
};
