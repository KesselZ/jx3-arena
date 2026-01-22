import { world } from '../engine/ecs'
import { GAME_CONFIG } from '../game/config'

export const movementSystem = (delta: number) => {
  const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS

  // 我们只处理有 position 和 velocity 属性的实体
  for (const entity of world.entities) {
    if (entity.position && entity.velocity) {
      entity.position.x += entity.velocity.x * delta
      entity.position.y += entity.velocity.y * delta
      entity.position.z += entity.velocity.z * delta

      // 边界限制 (空气墙)
      if (entity.id === 'player-main') {
        entity.position.x = Math.max(-bx, Math.min(bx, entity.position.x))
        entity.position.z = Math.max(-bz, Math.min(bz, entity.position.z))
      }
    }
  }
}
