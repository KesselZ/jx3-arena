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
