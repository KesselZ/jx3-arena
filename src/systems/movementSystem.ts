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

      // 5. 物理安全：限制物理速度上限，防止叠加爆炸
      Physics.limitVelocity(entity.velocity, 50); // 限制最大物理速度为 50

      // 6. 逻辑朝向判定：记录世界坐标系的移动方向
      // 判定优先级：移动意图 > 物理速度
      const intentSpeedSq = entity.moveIntent.x ** 2 + entity.moveIntent.z ** 2;
      const physicalSpeedSq = entity.velocity.x ** 2 + entity.velocity.z ** 2;

      if (intentSpeedSq > 0.01 || physicalSpeedSq > 0.25) {
        // 记录原始的世界坐标系移动向量，渲染层会结合相机视角来决定最终翻转
        entity.lastMoveX = intentSpeedSq > 0.01 ? entity.moveIntent.x : entity.velocity.x;
        entity.lastMoveZ = intentSpeedSq > 0.01 ? entity.moveIntent.z : entity.velocity.z;
      }

      // 边界限制 (空气墙)
      if (entity.type === 'player') {
        entity.position.x = Math.max(-bx, Math.min(bx, entity.position.x))
        entity.position.z = Math.max(-bz, Math.min(bz, entity.position.z))
      }
    }
  }
}
