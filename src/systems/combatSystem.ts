import * as THREE from 'three';
import { world, Entity } from '../engine/ecs';
import { findNearestHostile, findHero } from '../engine/targeting';
import { UNITS } from '../data/units';

/**
 * 战斗系统：负责检测范围并触发攻击逻辑
 */
export const combatSystem = (delta: number) => {
  const currentTime = performance.now() / 1000;
  
  for (const attacker of world.entities) {
    if (!attacker.attack || attacker.dead) continue;

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

    let target: Entity | null = null;
    if (attacker.type === 'enemy') {
      target = findHero(attacker);
    } else {
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
  
  const isMelee = attacker.attack!.type === 'melee';
  const vfxType = attacker.attack!.vfxType;
  const unitDef = attacker.unitId ? (UNITS as any)[attacker.unitId] : null;

  // --- 弹道发射逻辑 (远程攻击统一走弹道系统) ---
  if (!isMelee && unitDef?.combat?.projectile) {
    const pConfig = unitDef.combat.projectile;
    const speed = pConfig.speed;
    
    const projectileEntity: Entity = {
      id: 'projectile-' + (effectIdCounter++),
      type: 'bullet',
      position: { x: attacker.position.x, y: attacker.position.y + 1.2, z: attacker.position.z },
      velocity: { x: nx * speed, y: 0, z: nz * speed },
      moveIntent: { x: 0, y: 0, z: 0 },
      health: { current: 1, max: 1 },
      projectile: {
        damage: attacker.attack!.power,
        speed: speed,
        pierce: pConfig.pierce,
        maxPierce: pConfig.pierce,
        ownerId: attacker.id,
        targetId: pConfig.logic === 'tracking' ? target.id : undefined,
        hitEntities: new Set(),
        lifeTime: pConfig.lifeTime,
      },
      effect: {
        type: vfxType as any,
        startTime: time,
        duration: pConfig.lifeTime,
      }
    };
    world.add(projectileEntity);
    return; // 远程攻击不再直接应用伤害
  }

  // --- 直接伤害逻辑 (仅限近战) ---
  const kbPower = attacker.attack!.knockback || 0;
  const targetMass = target.physics?.mass || 1;
  const finalKnockback = kbPower / targetMass;

  if (target.velocity) {
    target.velocity.x += nx * finalKnockback;
    target.velocity.z += nz * finalKnockback;
  }

  if (target.health) {
    target.health.current -= attacker.attack!.power;
    target.health.lastHitTime = time;

    if (target.health.current <= 0) {
      target.health.current = 0;
      target.dead = true;
      target.deathTime = time;
      target.deathDir = { x: nx, y: 0, z: nz };
      
      delete target.ai;
      delete target.attack;
      delete target.input;
      if (target.velocity) {
        target.velocity.x = 0;
        target.velocity.z = 0;
      }
    }
  }

  // --- 产生特效 (找回近战特效) ---
  const duration = isMelee ? 0.3 : 0.8;
  const effectData: Entity = {
    id: `fx-${effectIdCounter++}`,
    type: 'effect',
    position: { x: attacker.position.x, y: attacker.position.y, z: attacker.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 1, max: 1 },
    lifetime: { remaining: duration },
    effect: {
      type: vfxType as any,
      startTime: time,
      duration: duration, 
      angle: angle, 
      attackerPos: { ...attacker.position }, 
      targetPos: { ...target.position },
      attackerType: attacker.type as any, 
      length: dist
    }
  };

  world.add(effectData);
};
