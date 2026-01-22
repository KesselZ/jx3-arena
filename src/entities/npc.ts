import { world, Entity } from '../engine/ecs'
import { UNITS } from '../data/units'

export const createNPC = (
  unitId: string, 
  type: 'enemy' | 'ally', 
  x: number, 
  z: number
): Entity => {
  const isEnemy = type === 'enemy';
  
  const unitConfig = UNITS[unitId];
  if (!unitConfig) throw new Error(`Unit definition not found: ${unitId}`);
  const combat = unitConfig.combat;
  
  return world.add({
    id: crypto.randomUUID(),
    type,
    unitId,
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 50, max: 50 },
    // 赋予 AI 组件
    ai: { 
      behavior: 'chase', // 默认都开启追逐逻辑
      targetId: undefined 
    },
    // 战斗属性显式对齐
    attack: { 
      power: combat.power, 
      speed: combat.speed, 
      range: combat.range, 
      type: combat.attackType,
      vfxType: combat.vfxType,
      burst: combat.burst,
      burstInterval: combat.burstInterval
    },
    stats: {
      speedMult: 1,
      baseSpeed: unitConfig.movement.speed,
      radius: unitConfig.radius ?? (unitConfig.scale * 0.35) // 降级方案：基于视觉比例自动计算
    }
  })
}

/**
 * 创建观众实体
 * 只有位置和渲染 ID，不参与战斗和移动逻辑
 */
export const createSpectator = (
  unitId: string,
  x: number,
  y: number,
  z: number
): Entity => {
  return world.add({
    id: crypto.randomUUID(),
    type: 'spectator',
    unitId,
    position: { x, y, z },
    // 观众不需要 velocity, health, ai, stats 等组件
    // 这样他们会自动被 movementSystem, aiSystem, combatSystem 忽略
  } as any) // 使用 any 绕过严格的 Entity 必填项检查，因为他们确实不需要那些
}
