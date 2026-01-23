import { world, Entity } from '../engine/ecs'
import { UNITS } from '../data/units'
import { Assets } from '../assets/assets'
import { GAME_CONFIG } from '../game/config'

export const createPlayer = (unitId: string, x: number, z: number): Entity => {
  const unitDef = UNITS[unitId];
  if (!unitDef) throw new Error(`Unit definition not found: ${unitId}`);
  const combat = unitDef.combat;

  return world.add({
    id: 'player-main',
    type: 'player',
    unitId, 
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    moveIntent: { x: 0, y: 0, z: 0 },
    health: { current: 10000, max: 10000 },
    facingFlip: false,
    visualFlip: 1,
    animOffset: Math.random() * 10, // 新增：随机动画偏移量
    attack: { 
      power: combat.power, 
      speed: combat.speed, 
      range: combat.range, 
      knockback: combat.knockback,
      type: combat.attackType,
      vfxType: combat.vfxType,
      burst: combat.burst,
      burstInterval: combat.burstInterval
    },
    physics: {
      damping: GAME_CONFIG.PHYSICS.DEFAULT_DAMPING,
      isGrounded: true,
      mass: 5 // 主角质量较大
    },
    // 玩家特有组件
    input: true, 
    stats: { 
      speedMult: 1, 
      luck: 10,
      baseSpeed: unitDef.movement.speed,
      radius: unitDef.radius ?? (unitDef.scale * 0.35), // 降级方案：基于视觉比例自动计算
    } 
  })
}
