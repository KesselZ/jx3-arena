import { world, Entity } from '../engine/ecs'
import { UNITS } from '../data/units'
import { GAME_CONFIG } from '../data/config'

export const createNPC = (
  unitId: string, 
  type: 'enemy' | 'ally', 
  x: number, 
  z: number,
  delay: number = 0 // 新增：延迟生成时间 (秒)
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
    moveIntent: { x: 0, y: 0, z: 0 },
    health: { current: 50, max: 50 },
    facingFlip: false,
    visualFlip: 1,
    spawnTimer: delay, // 设置延迟
    // 赋予 AI 组件
    ai: { 
      behavior: 'chase', // 默认都开启追逐逻辑
      targetId: undefined 
    },
    physics: {
      damping: GAME_CONFIG.PHYSICS.DEFAULT_DAMPING,
      isGrounded: true,
      mass: 1
    },
    animOffset: Math.random() * 10, // 新增：随机动画偏移量，打破“军队感”
    // 战斗属性显式对齐
    attack: { 
      power: combat.power, 
      speed: combat.speed, 
      range: combat.range, 
      knockback: combat.knockback,
      styleId: combat.styleId,
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
    facingFlip: false,
    visualFlip: 1,
    animOffset: Math.random() * 10,
  } as any)
}
