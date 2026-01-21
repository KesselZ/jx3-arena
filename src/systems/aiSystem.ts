import { world } from '../game/world'
import { GAME_CONFIG } from '../game/config'

export const aiSystem = (delta: number) => {
  const player = world.entities.find(e => e.id === 'player-main')
  if (!player) return

  for (const entity of world.entities) {
    if (entity.ai && entity.ai.behavior === 'chase' && entity.velocity) {
      const dx = player.position.x - entity.position.x
      const dz = player.position.z - entity.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      if (dist > 0.1) {
        // 简单的追逐逻辑
        const speed = 1.5 // 敌人移动速度
        entity.velocity.x = (dx / dist) * speed
        entity.velocity.z = (dz / dist) * speed
      } else {
        entity.velocity.x = 0
        entity.velocity.z = 0
      }
    }
  }
}
