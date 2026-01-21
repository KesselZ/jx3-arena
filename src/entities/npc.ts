import { world, Entity } from '../game/world'
import { UNITS } from '../assets/assets'

export const createNPC = (
  unitId: keyof typeof UNITS, 
  type: 'enemy' | 'ally', 
  x: number, 
  z: number
): Entity => {
  const isEnemy = type === 'enemy';
  
  return world.add({
    id: crypto.randomUUID(),
    type,
    unitId,
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 50, max: 50 },
    // 赋予 AI 组件
    ai: { 
      behavior: isEnemy ? 'chase' : 'idle',
      targetId: isEnemy ? 'player-main' : undefined
    },
    // 战斗属性
    attack: { 
      power: 5, 
      speed: 1, 
      range: 1.5, 
      type: 'melee' 
    },
  })
}
