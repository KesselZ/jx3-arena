import * as THREE from 'three';
import { world, Entity, entityMap, spawnDamageText, spawnGold } from '../engine/ecs';
import { findNearestHostile, findHero } from '../engine/targeting';
import { UNITS } from '../data/units';
import { AudioAssets, SoundPriority } from '../assets/audioAssets';
import { COMBAT_STYLES, CombatStyle } from '../data/combatConfig';

/**
 * 战斗系统：负责检测范围并触发攻击逻辑
 */
export const combatSystem = (delta: number) => {
  const currentTime = performance.now() / 1000;
  
  for (const attacker of world.entities) {
    if (!attacker.attack || attacker.dead || (attacker.spawnTimer !== undefined && attacker.spawnTimer > 0)) continue;

    let canAttack = false;
    const isBursting = (attacker.burstRemaining || 0) > 0;

    if (isBursting) {
      const interval = attacker.attack.burstInterval || 0.1;
      if (currentTime - (attacker.lastBurstTime || 0) >= interval) {
        canAttack = true;
      }
    } else {
      const lastAttack = attacker.lastAttackTime || 0;
      const attackInterval = 1 / attacker.attack.speed;
      if (currentTime - lastAttack >= attackInterval) {
        canAttack = true;
      }
    }

    if (!canAttack) continue;

    // 优先使用 AI 锁定的目标，如果没有则重新寻找最近目标
    let target: Entity | null = null;
    if (attacker.ai?.targetId) {
      target = entityMap.get(attacker.ai.targetId) || null;
      if (target && target.dead) target = null;
    }

    if (!target) {
      target = findNearestHostile(attacker);
    }

    if (!target) {
      attacker.currentTargetId = undefined;
      continue;
    }

    attacker.currentTargetId = target.id;

    const dx = target.position.x - attacker.position.x;
    const dz = target.position.z - attacker.position.z;
    const distSq = dx * dx + dz * dz;
    
    const attackerRadius = attacker.stats?.radius || 0;
    const targetRadius = target.stats?.radius || 0;
    const effectiveRange = attacker.attack.range + attackerRadius + targetRadius;
    const rangeSq = effectiveRange * effectiveRange;

    if (distSq <= rangeSq) {
      performAttack(attacker, target, currentTime);
    }
  }
};

let effectIdCounter = 0;

const performAttack = (attacker: Entity, target: Entity, time: number) => {
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

  const adx = target.position.x - attacker.position.x;
  const adz = target.position.z - attacker.position.z;
  const dist = Math.sqrt(adx * adx + adz * adz) || 1;
  const angle = Math.atan2(adx, adz);
  attacker.lastAttackAngle = angle;

  const nx = adx / dist;
  const nz = adz / dist;
  
  // --- 核心重构：声明式战斗风格 ---
  const styleId = attacker.attack!.styleId;
  const style = COMBAT_STYLES[styleId];
  if (!style) return;

  // 1. 动作发起音效 (不再关心逻辑类型)
  const attackerPriority = attacker.type === 'player' ? SoundPriority.HIGH : SoundPriority.LOW;
  if (style.sfx?.fire) {
    AudioAssets.play(style.sfx.fire, { 
      position: attacker.position, 
      priority: attackerPriority,
      sourceType: attacker.type as any
    });
  }

  // 2. 逻辑分流
  if (style.logic === 'ranged') {
    handleRangedAttack(attacker, target, style, nx, nz, time);
  } else {
    handleMeleeAttack(attacker, target, style, nx, nz, time, dist, angle);
  }
};

/**
 * 处理远程攻击逻辑
 */
function handleRangedAttack(attacker: Entity, target: Entity, style: CombatStyle, nx: number, nz: number, time: number) {
  const unitDef = attacker.unitId ? (UNITS as any)[attacker.unitId] : null;
  if (!unitDef?.combat?.projectile) return;

  const pConfig = unitDef.combat.projectile;
  const baseInterval = style.hitInterval || 0.5;
  // 预留秘籍加成接口: const bonus = useGameStore.getState().getBonus('hit_freq') || 0;
  const finalInterval = baseInterval; 

  const projectileEntity: Entity = {
    id: `projectile-${attacker.id}-${performance.now()}`,
    type: 'bullet',
    position: { x: attacker.position.x, y: attacker.position.y + 1.2, z: attacker.position.z },
    velocity: { x: nx * pConfig.speed, y: 0, z: nz * pConfig.speed },
    moveIntent: { x: 0, y: 0, z: 0 },
    health: { current: 1, max: 1 },
    projectile: {
      damage: attacker.attack!.power,
      speed: pConfig.speed,
      pierce: pConfig.pierce,
      maxPierce: pConfig.pierce,
      ownerId: attacker.id,
      targetId: pConfig.logic === 'tracking' ? target.id : undefined,
      hitEntities: new Map(), // 改为 Map
      hitInterval: finalInterval, 
      lifeTime: pConfig.lifeTime,
      styleId: style.id, // 核心：将战斗风格 ID 传递给弹道实体
    },
    effect: {
      type: style.vfx.type as any,
      startTime: time,
      duration: pConfig.lifeTime,
    }
  };
  world.add(projectileEntity);
}

/**
 * 处理近战攻击逻辑
 */
function handleMeleeAttack(attacker: Entity, target: Entity, style: CombatStyle, nx: number, nz: number, time: number, dist: number, angle: number) {
  // 1. 直接伤害逻辑
  const kbPower = attacker.attack!.knockback || 0;
  const targetMass = target.physics?.mass || 1;
  const finalKnockback = kbPower / targetMass;

  if (target.velocity && target.type !== 'player') {
    target.velocity.x += nx * finalKnockback;
    target.velocity.z += nz * finalKnockback;
  }

  if (target.health) {
    const damage = attacker.attack!.power;
    target.health.current -= damage;
    target.health.lastHitTime = time;
    
    // 只有敌人掉血才触发伤害飘字
    if (target.type === 'enemy') {
      spawnDamageText(damage, target.position);
    }

    // 播放命中音效 (使用 Style 定义的 hit 音效)
    const hitPriority = target.type === 'player' ? SoundPriority.CRITICAL : SoundPriority.NORMAL;
    AudioAssets.play(style.sfx.hit, { 
      position: target.position, 
      priority: hitPriority,
      sourceType: target.type as any
    });

    if (target.health.current <= 0) {
      target.health.current = 0;
      target.dead = true;
      target.deathTime = time;
      target.deathDir = { x: nx, y: 0, z: nz };
      
      // 敌人死亡掉落金币
      if (target.type === 'enemy') {
        // spawnGold(target.position, 10); // 消融实验：暂时关闭金币掉落
      }

      delete target.ai;
      delete target.attack;
      delete target.input;
      if (target.velocity) {
        target.velocity.x = 0;
        target.velocity.z = 0;
      }
    }
  }

  // 2. 产生近战特效
  const effectData: Entity = {
    id: `fx-${performance.now()}-${Math.random()}`,
    type: 'effect',
    position: { x: attacker.position.x, y: attacker.position.y, z: attacker.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 1, max: 1 },
    lifetime: { remaining: style.vfx.duration },
    effect: {
      type: style.vfx.type as any,
      startTime: time,
      duration: style.vfx.duration, 
      angle: angle, 
      attackerPos: { ...attacker.position }, 
      targetPos: { ...target.position },
      attackerType: attacker.type as any, 
      length: dist
    }
  };
  world.add(effectData);
}
