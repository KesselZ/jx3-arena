import { Entity } from './ecs'
import { GAME_CONFIG } from '../data/config'

/**
 * SpatialHashV2: 分层空间哈希 (基于项目原生 type 优化版)
 */
export class SpatialHash {
  private readonly BOUNDS_X = GAME_CONFIG.BATTLE.SCREEN_BOUNDS.x
  private readonly BOUNDS_Z = GAME_CONFIG.BATTLE.SCREEN_BOUNDS.z
  private readonly MAP_SIZE_X = this.BOUNDS_X * 2
  private readonly MAP_SIZE_Z = this.BOUNDS_Z * 2
  
  private readonly L1_CELL_SIZE = 2
  private readonly L2_CELL_SIZE = 10
  
  private readonly L1_COUNT_X = Math.ceil(this.MAP_SIZE_X / this.L1_CELL_SIZE)
  private readonly L1_COUNT_Z = Math.ceil(this.MAP_SIZE_Z / this.L1_CELL_SIZE)
  private readonly L2_COUNT_X = Math.ceil(this.MAP_SIZE_X / this.L2_CELL_SIZE)
  private readonly L2_COUNT_Z = Math.ceil(this.MAP_SIZE_Z / this.L2_CELL_SIZE)

  private l1Blackboard: Uint32Array
  private l2Blackboard: Uint32Array

  // 全局黑板：汇总全图单位数量
  public totalFriendly = 0 // player + ally
  public totalEnemy = 0    // enemy

  private l1Cells: Entity[][]

  constructor() {
    this.l1Blackboard = new Uint32Array(this.L1_COUNT_X * this.L1_COUNT_Z)
    this.l2Blackboard = new Uint32Array(this.L2_COUNT_X * this.L2_COUNT_Z)
    this.l1Cells = Array.from({ length: this.L1_COUNT_X * this.L1_COUNT_Z }, () => [])
  }

  clear() {
    this.l1Blackboard.fill(0)
    this.l2Blackboard.fill(0)
    this.totalFriendly = 0
    this.totalEnemy = 0
    for (let i = 0; i < this.l1Cells.length; i++) {
      this.l1Cells[i].length = 0 
    }
  }

  insert(entity: Entity) {
    const x = entity.position.x + this.BOUNDS_X
    const z = entity.position.z + this.BOUNDS_Z

    if (x < 0 || x >= this.MAP_SIZE_X || z < 0 || z >= this.MAP_SIZE_Z) return

    const ix1 = Math.floor(x / this.L1_CELL_SIZE)
    const iz1 = Math.floor(z / this.L1_CELL_SIZE)
    
    // 安全检查：防止数组越界导致 push 报错
    if (ix1 < 0 || ix1 >= this.L1_COUNT_X || iz1 < 0 || iz1 >= this.L1_COUNT_Z) return;
    
    const l1Idx = ix1 * this.L1_COUNT_Z + iz1
    
    // 终极防御：如果由于某种原因 l1Idx 还是不合法
    if (l1Idx < 0 || l1Idx >= this.l1Cells.length || !this.l1Cells[l1Idx]) return;

    const ix2 = Math.floor(x / this.L2_CELL_SIZE)
    const iz2 = Math.floor(z / this.L2_CELL_SIZE)
    
    // 安全检查：L2 索引
    if (ix2 < 0 || ix2 >= this.L2_COUNT_X || iz2 < 0 || iz2 >= this.L2_COUNT_Z) return;
    
    const l2Idx = ix2 * this.L2_COUNT_Z + iz2

    // 映射阵营到位运算计数
    // 高16位：Friendly (player/ally)
    // 低16位：Enemy
    const isFriendly = entity.type === 'player' || entity.type === 'ally'
    if (isFriendly) {
      this.totalFriendly++
      this.l1Blackboard[l1Idx] += 0x00010000
      this.l2Blackboard[l2Idx] += 0x00010000
    } else if (entity.type === 'enemy') {
      this.totalEnemy++
      this.l1Blackboard[l1Idx] += 0x00000001
      this.l2Blackboard[l2Idx] += 0x00000001
    }

    this.l1Cells[l1Idx].push(entity)
  }

  query(x: number, z: number, range: number, targetSide?: 'friendly' | 'enemy', out?: Entity[]): Entity[] {
    const results = out || []
    if (out) results.length = 0
    
    const worldX = x + this.BOUNDS_X
    const worldZ = z + this.BOUNDS_Z

    const startX = Math.max(0, worldX - range)
    const endX = Math.min(this.MAP_SIZE_X - 0.01, worldX + range)
    const startZ = Math.max(0, worldZ - range)
    const endZ = Math.min(this.MAP_SIZE_Z - 0.01, worldZ + range)

    const sX2 = Math.floor(startX / this.L2_CELL_SIZE)
    const eX2 = Math.floor(endX / this.L2_CELL_SIZE)
    const sZ2 = Math.floor(startZ / this.L2_CELL_SIZE)
    const eZ2 = Math.floor(endZ / this.L2_CELL_SIZE)

    for (let ix2 = sX2; ix2 <= eX2; ix2++) {
      for (let iz2 = sZ2; iz2 <= eZ2; iz2++) {
        const l2Idx = Math.floor(ix2 * this.L2_COUNT_Z + iz2)
        const l2Val = this.l2Blackboard[l2Idx]

        if (l2Val === 0) continue
        // 剪枝逻辑
        if (targetSide === 'friendly' && (l2Val & 0xFFFF0000) === 0) continue
        if (targetSide === 'enemy' && (l2Val & 0x0000FFFF) === 0) continue

        const sX1 = Math.max(Math.floor(startX / this.L1_CELL_SIZE), ix2 * 5)
        const eX1 = Math.min(Math.floor(endX / this.L1_CELL_SIZE), (ix2 + 1) * 5 - 1)
        const sZ1 = Math.max(Math.floor(startZ / this.L1_CELL_SIZE), iz2 * 5)
        const eZ1 = Math.min(Math.floor(endZ / this.L1_CELL_SIZE), (iz2 + 1) * 5 - 1)

        for (let ix1 = sX1; ix1 <= eX1; ix1++) {
          for (let iz1 = sZ1; iz1 <= eZ1; iz1++) {
            const l1Idx = ix1 * this.L1_COUNT_Z + iz1
            const l1Val = this.l1Blackboard[l1Idx]

            if (l1Val === 0) continue
            if (targetSide === 'friendly' && (l1Val & 0xFFFF0000) === 0) continue
            if (targetSide === 'enemy' && (l1Val & 0x0000FFFF) === 0) continue

            const cell = this.l1Cells[l1Idx]
            for (let i = 0; i < cell.length; i++) {
              const e = cell[i]
              if (!targetSide) {
                results.push(e)
              } else {
                const isEFriendly = e.type === 'player' || e.type === 'ally'
                if (targetSide === 'friendly' && isEFriendly) results.push(e)
                else if (targetSide === 'enemy' && !isEFriendly) results.push(e)
              }
            }
          }
        }
      }
    }

    return results
  }
}

export const spatialHash = new SpatialHash()
