import { world } from '../engine/ecs'
import { GAME_CONFIG } from '../data/config'
import { Physics } from '../engine/physics'

export const movementSystem = (delta: number) => {
  const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS

  for (const entity of world.entities) {
    // 处理出生预警倒计时
    if (entity.spawnTimer !== undefined && entity.spawnTimer > 0) {
      entity.spawnTimer -= delta;
      if (entity.spawnTimer <= 0) {
        entity.spawnTimer = undefined; // 倒计时结束，正式激活
      }
      continue; // 预警期间不参与任何移动和物理逻辑
    }

    if (entity.position && entity.velocity && entity.moveIntent) {
      // 只有特定类型的实体（玩家、敌人、盟友）参与常规移动系统的重力、阻尼和边界限制
      const isCombatant = entity.type === 'player' || entity.type === 'enemy' || entity.type === 'ally';
      if (!isCombatant) continue;
      
      // 1. 物理层：应用阻尼衰减 (Physics Engine 驱动)
      // 物理速度 (velocity) 会随时间自然停下
      const damping = entity.physics?.damping ?? GAME_CONFIG.PHYSICS.DEFAULT_DAMPING;
      Physics.applyDamping(entity.velocity, damping, delta);

      // 2. 意图层：基础移动位移 (Intent * BaseSpeed)
      // 移动意图由 AI 或 Input 系统设置，它是恒定的，不被物理阻尼影响
      const baseSpeed = entity.stats?.baseSpeed || 0;
      const intentX = entity.moveIntent.x * baseSpeed * delta;
      const intentZ = entity.moveIntent.z * baseSpeed * delta;

      // 3. 物理层：重力与击飞处理
      const gravity = GAME_CONFIG.PHYSICS.GRAVITY;
      entity.physics = entity.physics || { damping: GAME_CONFIG.PHYSICS.DEFAULT_DAMPING, isGrounded: true, mass: 1 };
      entity.physics.isGrounded = Physics.applyGravity(entity.position, entity.velocity, gravity, delta);

      // 4. 最终位移应用：意图位移 + 物理速度位移
      entity.position.x += intentX + entity.velocity.x * delta;
      entity.position.z += intentZ + entity.velocity.z * delta;

      // 5. 物理安全：限制物理速度上限，防止叠加爆炸
      Physics.limitVelocity(entity.velocity, GAME_CONFIG.PHYSICS.MAX_VELOCITY); 

      // 6. 逻辑朝向判定：记录世界坐标系的移动方向
      // 判定优先级：移动意图 > 物理速度
      const intentSpeedSq = entity.moveIntent.x ** 2 + entity.moveIntent.z ** 2;
      const physicalSpeedSq = entity.velocity.x ** 2 + entity.velocity.z ** 2;

      if (intentSpeedSq > 0.01 || physicalSpeedSq > 0.25) {
        const newMoveX = intentSpeedSq > 0.01 ? entity.moveIntent.x : entity.velocity.x;
        const newMoveZ = intentSpeedSq > 0.01 ? entity.moveIntent.z : entity.velocity.z;

        // --- 核心优化：意图过滤 (Hysteresis) ---
        // 玩家本人不应用此过滤，保证操作响应灵敏
        const isPlayer = entity.id === 'player-main';

        if (!isPlayer && entity.lastMoveX !== undefined) {
          const dot = newMoveX * entity.lastMoveX + newMoveZ * entity.lastMoveZ;
          const currentTime = performance.now() / 1000;

          if (dot < -0.1) { // 方向相反
            if (!entity.flipPendingTime) {
              entity.flipPendingTime = currentTime;
            }
            
            // 只有当反向意图持续超过配置时长，才准许更新 lastMove
            if (currentTime - entity.flipPendingTime > GAME_CONFIG.VISUAL.FACING_HYSTERESIS) {
              entity.lastMoveX = newMoveX;
              entity.lastMoveZ = newMoveZ;
              entity.flipPendingTime = undefined;
            }
          } else {
            // 方向基本一致，正常更新并重置计时器
            entity.lastMoveX = newMoveX;
            entity.lastMoveZ = newMoveZ;
            entity.flipPendingTime = undefined;
          }
        } else {
          // 初始状态，直接赋值
          entity.lastMoveX = newMoveX;
          entity.lastMoveZ = newMoveZ;
        }
      }

      // 边界限制 (空气墙) - 对所有战斗单位生效
      entity.position.x = Math.max(-bx, Math.min(bx, entity.position.x))
      entity.position.z = Math.max(-bz, Math.min(bz, entity.position.z))
    }
  }
}
