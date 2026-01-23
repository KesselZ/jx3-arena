import { world } from '../engine/ecs'
import { GAME_CONFIG } from '../game/config'
import { Physics } from '../engine/physics'

export const movementSystem = (delta: number) => {
  const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS

  for (const entity of world.entities) {
    if (entity.position && entity.velocity && entity.moveIntent) {
      
      // 1. 物理层：应用阻尼衰减 (Physics Engine 驱动)
      // 物理速度 (velocity) 会随时间自然停下
      const damping = entity.physics?.damping || 0.8;
      Physics.applyDamping(entity.velocity, damping, delta);

      // 2. 意图层：基础移动位移 (Intent * BaseSpeed)
      // 移动意图由 AI 或 Input 系统设置，它是恒定的，不被物理阻尼影响
      const baseSpeed = entity.stats?.baseSpeed || 0;
      const intentX = entity.moveIntent.x * baseSpeed * delta;
      const intentZ = entity.moveIntent.z * baseSpeed * delta;

      // 3. 物理层：重力与击飞处理
      const gravity = 20; // 这里的重力数值可以根据手感调整
      entity.physics = entity.physics || { damping: 0.8, isGrounded: true, mass: 1 };
      entity.physics.isGrounded = Physics.applyGravity(entity.position, entity.velocity, gravity, delta);

      // 4. 最终位移应用：意图位移 + 物理速度位移
      entity.position.x += intentX + entity.velocity.x * delta;
      entity.position.z += intentZ + entity.velocity.z * delta;

      // 边界限制 (空气墙)
      if (entity.type === 'player') {
        entity.position.x = Math.max(-bx, Math.min(bx, entity.position.x))
        entity.position.z = Math.max(-bz, Math.min(bz, entity.position.z))
      }
    }
  }
}
