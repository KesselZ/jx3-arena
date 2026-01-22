import { world } from '../engine/ecs'

export const movementSystem = (delta: number) => {
  // 我们只处理有 position 和 velocity 属性的实体
  for (const entity of world.entities) {
    if (entity.position && entity.velocity) {
      entity.position.x += entity.velocity.x * delta
      entity.position.y += entity.velocity.y * delta
      entity.position.z += entity.velocity.z * delta
    }
  }
}
