import { world } from '../game/world'
import { GAME_CONFIG } from '../game/config'
import * as THREE from 'three'

/**
 * 输入系统：将按键状态转化为玩家实体的速度
 * 采用“相机相对坐标系”：W 永远是相机正前方
 */
export const inputSystem = (keys: Record<string, boolean>, camera: THREE.Camera) => {
  const player = world.entities.find(e => e.id === 'player-main')
  if (!player || !player.velocity) return

  const moveSpeed = GAME_CONFIG.BATTLE.PLAYER_INITIAL_SPEED
  
  // 每一帧重置速度
  player.velocity.x = 0
  player.velocity.z = 0

  // 计算相机的水平正方向 (忽略 Y 轴)
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
  forward.y = 0
  forward.normalize()

  // 计算相机的水平右方向
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
  right.y = 0
  right.normalize()

  let moveX = 0
  let moveZ = 0

  if (keys['KeyW']) {
    moveX += forward.x
    moveZ += forward.z
  }
  if (keys['KeyS']) {
    moveX -= forward.x
    moveZ -= forward.z
  }
  if (keys['KeyA']) {
    moveX -= right.x
    moveZ -= right.z
  }
  if (keys['KeyD']) {
    moveX += right.x
    moveZ += right.z
  }

  // 归一化移动向量，防止斜向移动过快
  if (moveX !== 0 || moveZ !== 0) {
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ)
    player.velocity.x = (moveX / length) * moveSpeed
    player.velocity.z = (moveZ / length) * moveSpeed
  }
}
