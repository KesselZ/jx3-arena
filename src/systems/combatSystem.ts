import * as THREE from 'three';
import { world, Entity, queries } from '../game/world';
import { GAME_CONFIG } from '../game/config';

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
        // 如果旧目标还在粘性射程内，就继续追着打
        if (pDistSq <= (attacker.attack.range * GAME_CONFIG.BATTLE.TARGET_STICKY_MULT) ** 2) {
          target = prevTarget;
        }
      }
    }

    if (!target) {
      target = findNearest(attacker);
    }

    if (!target) {
      attacker.currentTargetId = undefined;
      continue;
    }

    attacker.currentTargetId = target.id;

    // 3. 距离检测
    const dx = target.position.x - attacker.position.x;
    const dz = target.position.z - attacker.position.z;
    const distSq = dx * dx + dz * dz;
    const rangeSq = attacker.attack.range * attacker.attack.range;

    if (distSq <= rangeSq) {
      // 触发攻击！
      performAttack(attacker, target, currentTime);
    }
  }
};

const findNearest = (attacker: Entity): Entity | null => {
  let nearest: Entity | null = null;
  let minDistSq = Infinity;
  
  const isAttackerEnemy = attacker.type === 'enemy';
  const candidates = queries.combatants.entities;

  for (const entity of candidates) {
    if (entity.dead || entity === attacker) continue;
    
    // 判定阵营敌对关系
    const isEnemy = isAttackerEnemy 
      ? (entity.type === 'player' || entity.type === 'ally')
      : (entity.type === 'enemy');

    if (!isEnemy) continue;
    
    const dx = entity.position.x - attacker.position.x;
    const dz = entity.position.z - attacker.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      nearest = entity;
    }
  }
  return nearest;
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
    target.lifetime = { remaining: GAME_CONFIG.BATTLE.DEATH_DURATION }; 
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
    position: { ...attacker.position }, // 关键修正：特效产生在攻击者位置
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 1, max: 1 },
    lifetime: { remaining: isMelee ? 0.3 : 0.8 }, // 延长远程特效寿命到 0.8s
    effect: {
      type: attacker.attack!.vfxType,
      startTime: time,
      duration: isMelee ? 0.3 : 0.8, // 延长远程特效持续时间
      angle, 
      attackerPos: { ...attacker.position }, 
      targetPos: { ...target.position },
      attackerType: attacker.type as any, 
      length: Math.sqrt(dx * dx + dz * dz)
    }
  });
};
