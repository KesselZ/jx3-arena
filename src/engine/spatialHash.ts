import { Entity } from './ecs'
import { GAME_CONFIG } from '../game/config'

/**
 * SpatialHash: 空间哈希管理器 (零 GC 高性能版)
 * 职责：将世界划分为网格，实现 $O(1)$ 的插入和区域查询
 * 优化：使用数值 Key 代替字符串 Key，完全消除运行时的 GC 压力
 */
export class SpatialHash {
  private cellSize: number
  // 使用 Map<number, Entity[]>，Key 是合并后的 32 位整数
  private grid: Map<number, Entity[]> = new Map()

  constructor(cellSize: number = 2) {
    this.cellSize = cellSize
  }

  /**
   * 将二维网格坐标映射为一个 32 位整数 Key
   * 高 16 位存 X，低 16 位存 Z
   * 偏移 32768 是为了支持负坐标 (范围: -32768 到 32767)
   */
  private makeKey(x: number, z: number): number {
    const cx = (Math.floor(x / this.cellSize) + 32768) & 0xFFFF
    const cz = (Math.floor(z / this.cellSize) + 32768) & 0xFFFF
    return (cx << 16) | cz
  }

  /**
   * 清空网格 (每一帧开始时调用)
   */
  clear() {
    this.grid.clear()
  }

  /**
   * 将实体插入网格
   */
  insert(entity: Entity) {
    const key = this.makeKey(entity.position.x, entity.position.z)
    let cell = this.grid.get(key)
    if (!cell) {
      cell = []
      this.grid.set(key, cell)
    }
    cell.push(entity)
  }

  /**
   * 查询某个位置周边的实体 (当前格子 + 周围所有受影响的格子)
   */
  query(x: number, z: number, range: number): Entity[] {
    const results: Entity[] = []
    
    // 计算查询范围覆盖的所有格子索引
    const startX = Math.floor((x - range) / this.cellSize)
    const endX = Math.floor((x + range) / this.cellSize)
    const startZ = Math.floor((z - range) / this.cellSize)
    const endZ = Math.floor((z + range) / this.cellSize)

    for (let ix = startX; ix <= endX; ix++) {
      for (let iz = startZ; iz <= endZ; iz++) {
        // 复用 makeKey 的逻辑，但这里直接手动合并索引以获得极致性能
        const key = ((ix + 32768) << 16) | (iz + 32768)
        const cell = this.grid.get(key)
        if (cell) {
          results.push(...cell)
        }
      }
    }
    return results
  }
}

// 导出单例，使用配置中的网格大小
export const spatialHash = new SpatialHash(GAME_CONFIG.VISUAL.GRID_SIZE)
