import { world, Entity } from '../game/world'
import { UNITS } from '../assets/assets'

export const createPlayer = (unitId: keyof typeof UNITS, x: number, z: number): Entity => {
  return world.add({
    id: 'player-main',
    type: 'player',
    unitId, // 使用选择的角色 ID
    position: { x, y: 0, z },
    velocity: { x: 0, y: 0, z: 0 },
    health: { current: 100, max: 100 },
    attack: { power: 10, speed: 1, range: 2, type: 'melee' },
    // 玩家特有组件
    input: true, 
    stats: { speedMult: 1, luck: 10 } 
  })
}
