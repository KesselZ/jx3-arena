import { GAME_CONFIG } from '../game/config'
import { createNPC } from '../entities/npc'
import { UNITS } from '../data/units'

let lastSpawnTime = 0
let totalSpawnedInWave = 0

/**
 * 刷怪系统：根据当前波次池随机生成敌人
 */
export const spawnSystem = (
  delta: number, 
  elapsedTime: number, 
  currentWave: number
) => {
  // 获取当前波次配置
  const waveConfig = GAME_CONFIG.WAVES[currentWave as keyof typeof GAME_CONFIG.WAVES] || GAME_CONFIG.WAVES[1]
  
  // 检查是否达到该波次最大刷怪上限
  if (totalSpawnedInWave >= waveConfig.count) return

  // 计时器逻辑
  if (elapsedTime - lastSpawnTime > GAME_CONFIG.BATTLE.SPAWN_INTERVAL) {
    lastSpawnTime = elapsedTime
    
    // 从池子中随机选一个敌人
    const randomUnitId = waveConfig.pool[Math.floor(Math.random() * waveConfig.pool.length)]
    
    // 计算刷怪位置：屏幕边缘
    const spawnPos = getRandomEdgePosition()
    
    // 创建实体
    createNPC(randomUnitId, 'enemy', spawnPos.x, spawnPos.z)
    totalSpawnedInWave++
  }
}

/**
 * 重置系统状态（每一波开始时调用）
 */
export const resetSpawner = () => {
  lastSpawnTime = 0
  totalSpawnedInWave = 0
}

/**
 * 获取屏幕边缘的随机坐标
 */
function getRandomEdgePosition() {
  const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS
  
  // 随机选一条边 (0:上, 1:下, 2:左, 3:右)
  const edge = Math.floor(Math.random() * 4)
  let x = 0, z = 0

  // 核心修改：将 margin 改为负数，让敌人在 70*70 区域内边缘生成
  const margin = -2 
  
  switch (edge) {
    case 0: // 上
      x = (Math.random() - 0.5) * bx * 2
      z = -bz - margin
      break
    case 1: // 下
      x = (Math.random() - 0.5) * bx * 2
      z = bz + margin
      break
    case 2: // 左
      x = -bx - margin
      z = (Math.random() - 0.5) * bz * 2
      break
    case 3: // 右
      x = bx + margin
      z = (Math.random() - 0.5) * bz * 2
      break
  }

  return { x, z }
}
