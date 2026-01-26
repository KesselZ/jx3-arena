import { world } from '../engine/ecs'
import { GAME_CONFIG } from '../data/config'
import { Physics } from '../engine/physics'

/**
 * movementSystem: 移动系统
 * 优化点：
 * 1. 变量提升：将配置常量提到循环外，减少深层对象访问开销
 * 2. 减少 API 调用：使用 if 替代 Math.min/max 边界限制
 * 3. 逻辑分片 (LOD)：AI 朝向计算每 3 帧更新一次，平滑 CPU 占用
 * 4. 减少数学运算：移除冗余的平方和计算，改用直接的零值判定
 */
export const movementSystem = (delta: number) => {
  const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS
  const maxVel = GAME_CONFIG.PHYSICS.MAX_VELOCITY
  const defaultDamping = GAME_CONFIG.PHYSICS.DEFAULT_DAMPING
  const gravity = GAME_CONFIG.PHYSICS.GRAVITY
  const facingHysteresis = GAME_CONFIG.VISUAL.FACING_HYSTERESIS
  const currentTime = performance.now() / 1000

  const entities = world.entities
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]

    // 1. 快速排除：处理出生预警
    if (entity.spawnTimer !== undefined && entity.spawnTimer > 0) {
      entity.spawnTimer -= delta
      continue
    }

    const { position, velocity, moveIntent, type, stats, id } = entity
    if (!position || !velocity || !moveIntent) continue
    
    // 只有特定类型的实体（玩家、敌人、盟友）参与常规移动逻辑
    if (type !== 'player' && type !== 'enemy' && type !== 'ally') continue

    // 2. 物理层：应用阻尼衰减
    const damping = entity.physics?.damping ?? defaultDamping
    Physics.applyDamping(velocity, damping, delta)

    // 3. 意图与物理位移合并应用
    const baseSpeed = (stats?.baseSpeed || 0) * delta
    const intentX = moveIntent.x * baseSpeed
    const intentZ = moveIntent.z * baseSpeed
    
    position.x += intentX + velocity.x * delta
    position.z += intentZ + velocity.z * delta

    // 4. 物理层：重力与击飞处理
    if (!entity.physics) {
      entity.physics = { damping: defaultDamping, isGrounded: true, mass: 1 }
    }
    entity.physics.isGrounded = Physics.applyGravity(position, velocity, gravity, delta)

    // 5. 物理安全：限制物理速度上限 (仅在必要时调用)
    if (velocity.x * velocity.x + velocity.z * velocity.z > maxVel * maxVel) {
      Physics.limitVelocity(velocity, maxVel)
    }

    // 6. 朝向判定 (LOD 优化：AI 每 3 帧更新一次)
    const isPlayer = id === 'player-main'
    // 只有当有移动意图或物理速度时才考虑朝向更新
    if (moveIntent.x !== 0 || moveIntent.z !== 0 || velocity.x !== 0 || velocity.z !== 0) {
      // 玩家保持灵敏，AI 错峰更新
      const shouldUpdateFacing = isPlayer || ((i + Math.floor(currentTime * 60)) % 3 === 0)

      if (shouldUpdateFacing) {
        const newMoveX = (moveIntent.x * moveIntent.x + moveIntent.z * moveIntent.z > 0.01) ? moveIntent.x : velocity.x
        const newMoveZ = (moveIntent.x * moveIntent.x + moveIntent.z * moveIntent.z > 0.01) ? moveIntent.z : velocity.z

        if (!isPlayer && entity.lastMoveX !== undefined && entity.lastMoveZ !== undefined) {
          const dot = newMoveX * entity.lastMoveX + newMoveZ * entity.lastMoveZ
          
          if (dot < -0.1) { // 方向相反
            if (!entity.flipPendingTime) {
              entity.flipPendingTime = currentTime
            }
            
            if (currentTime - entity.flipPendingTime > facingHysteresis) {
              entity.lastMoveX = newMoveX
              entity.lastMoveZ = newMoveZ
              entity.flipPendingTime = undefined
            }
          } else {
            // 方向基本一致，正常更新并重置计时器
            entity.lastMoveX = newMoveX
            entity.lastMoveZ = newMoveZ
            entity.flipPendingTime = undefined
          }
        } else {
          // 初始状态或玩家，直接赋值
          entity.lastMoveX = newMoveX
          entity.lastMoveZ = newMoveZ
        }
      }
    }

    // 7. 边界限制 (使用 if 替代 Math.min/max，减少函数调用开销)
    if (position.x > bx) position.x = bx
    else if (position.x < -bx) position.x = -bx
    
    if (position.z > bz) position.z = bz
    else if (position.z < -bz) position.z = -bz
  }
}
