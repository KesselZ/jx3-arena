import { world } from '../game/world'
import { GAME_CONFIG } from '../game/config'

/**
 * 输入系统：将按键状态转化为玩家实体的速度
 */
export const inputSystem = (keys: Record<string, boolean>) => {
  const player = world.entities.find(e => e.id === 'player-main')
  if (!player || !player.velocity) return

  const moveSpeed = GAME_CONFIG.BATTLE.PLAYER_INITIAL_SPEED
  
  // 每一帧重置速度，确保不按键时停止
  player.velocity.x = 0
  player.velocity.z = 0

  if (keys['KeyW']) player.velocity.z -= moveSpeed
  if (keys['KeyS']) player.velocity.z += moveSpeed
  if (keys['KeyA']) player.velocity.x -= moveSpeed
  if (keys['KeyD']) player.velocity.x += moveSpeed
}
