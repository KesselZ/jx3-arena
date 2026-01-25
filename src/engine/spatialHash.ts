import { Entity } from './ecs'
import { GAME_CONFIG } from '../data/config'

/**
 * SpatialHashV2: 分层空间哈希 (基于掩码的高性能过滤版)
 */

// 定义类别掩码 (Bitmask)
export const SH_CATEGORY = {
  NONE: 0,
  PLAYER: 1 << 0,     // 1
  ENEMY: 1 << 1,      // 2
  ALLY: 1 << 2,       // 4
  LOOT: 1 << 3,       // 8 (金币/掉落物)
  PROJECTILE: 1 << 4, // 16 (普通弹道)
} as const;

export type SH_Category = typeof SH_CATEGORY[keyof typeof SH_CATEGORY];

// 类别索引映射，用于快速定位桶
const CAT_TO_IDX: Record<number, number> = {
  [1 << 0]: 0, // PLAYER
  [1 << 1]: 1, // ENEMY
  [1 << 2]: 2, // ALLY
  [1 << 3]: 3, // LOOT
  [1 << 4]: 4, // PROJECTILE
};
const NUM_CATEGORIES = 5;

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

  // --- SIMD 风格数据布局 ---
  private readonly MAX_ENTITIES = 10000;
  private poolX = new Float32Array(this.MAX_ENTITIES);
  private poolZ = new Float32Array(this.MAX_ENTITIES);
  private poolR = new Float32Array(this.MAX_ENTITIES);
  private poolEntityIdx = new Int32Array(this.MAX_ENTITIES); 
  private poolSize = 0;

  // 核心重构：将单桶改为多桶存储 [cellIdx][categoryIdx]
  private l1Buckets: Entity[][][]
  // 零分配优化：预分配每个桶的初始容量，减少扩容频率
  private readonly INITIAL_BUCKET_CAPACITY = 8;

  // 存储实体在 pool 中的索引，用于快速访问坐标
  private entityPoolIndices = new Map<number, number>(); 

  // 全局分类桶
  private globalBuckets: Entity[][]

  // 零分配优化：内部共享的结果集，防止外部调用忘记传 out 导致产生新数组
  private internalQueryResult: Entity[] = [];

  // 性能监控计数器
  public debugStats = {
    insertCount: 0,
    queryCount: 0,
    candidateCount: 0,
    fallbackCount: 0 
  }

  constructor() {
    const totalCells = this.L1_COUNT_X * this.L1_COUNT_Z;
    this.l1Blackboard = new Uint32Array(totalCells)
    this.l2Blackboard = new Uint32Array(this.L2_COUNT_X * this.L2_COUNT_Z)
    
    // 初始化多维桶，并预分配容量
    this.l1Buckets = Array.from({ length: totalCells }, () => 
      Array.from({ length: NUM_CATEGORIES }, () => {
        const arr = [];
        // 预扩容技巧：虽然 JS 数组是动态的，但某些引擎下预填充可以减少初期扩容
        return arr;
      })
    );
    // 初始化全局分类桶
    this.globalBuckets = Array.from({ length: NUM_CATEGORIES }, () => []);
  }

  clear() {
    this.l1Blackboard.fill(0)
    this.l2Blackboard.fill(0)
    this.debugStats.insertCount = 0
    this.debugStats.queryCount = 0
    this.debugStats.candidateCount = 0
    this.debugStats.fallbackCount = 0
    
    this.poolSize = 0;
    this.entityPoolIndices.clear();

    // 清空所有局部桶
    for (let i = 0; i < this.l1Buckets.length; i++) {
      const cell = this.l1Buckets[i];
      for (let j = 0; j < NUM_CATEGORIES; j++) {
        cell[j].length = 0;
      }
    }
    // 清空所有全局桶
    for (let j = 0; j < NUM_CATEGORIES; j++) {
      this.globalBuckets[j].length = 0;
    }
  }

  /**
   * 获取实体的掩码类别
   */
  private getCategory(entity: Entity): SH_Category {
    if (entity.type === 'player') return SH_CATEGORY.PLAYER;
    if (entity.type === 'enemy') return SH_CATEGORY.ENEMY;
    if (entity.type === 'ally') return SH_CATEGORY.ALLY;
    if (entity.money) return SH_CATEGORY.LOOT;
    if (entity.projectile) return SH_CATEGORY.PROJECTILE;
    return SH_CATEGORY.NONE;
  }

  insert(entity: Entity) {
    const x = entity.position.x + this.BOUNDS_X
    const z = entity.position.z + this.BOUNDS_Z

    if (x < 0 || x >= this.MAP_SIZE_X || z < 0 || z >= this.MAP_SIZE_Z) return

    const ix1 = Math.floor(x / this.L1_CELL_SIZE)
    const iz1 = Math.floor(z / this.L1_CELL_SIZE)
    const l1Idx = ix1 * this.L1_COUNT_Z + iz1
    
    if (l1Idx < 0 || l1Idx >= this.l1Buckets.length) return;

    const ix2 = Math.floor(x / this.L2_CELL_SIZE)
    const iz2 = Math.floor(z / this.L2_CELL_SIZE)
    const l2Idx = ix2 * this.L2_COUNT_Z + iz2

    // 1. 获取类别
    const category = this.getCategory(entity);
    if (category === SH_CATEGORY.NONE) return; 

    // 2. 预打标签
    entity._shCategory = category;
    
    // 3. 更新黑板（位运算存在性标记）
    this.l1Blackboard[l1Idx] |= category;
    this.l2Blackboard[l2Idx] |= category;

    // 4. 精准入桶
    const catIdx = CAT_TO_IDX[category];
    const bucket = this.l1Buckets[l1Idx][catIdx];
    
    // --- 填充 SIMD 坐标池 ---
    if (this.poolSize < this.MAX_ENTITIES) {
      const pIdx = this.poolSize++;
      this.poolX[pIdx] = entity.position.x;
      this.poolZ[pIdx] = entity.position.z;
      this.poolR[pIdx] = entity.stats?.radius || 0.5;
      this.entityPoolIndices.set(entity.id as any, pIdx);
    }

    bucket.push(entity)
    
    // 5. 全局入桶 (用于回退逻辑)
    this.globalBuckets[catIdx].push(entity);
    
    this.debugStats.insertCount++
  }

  /**
   * 查询指定范围内的实体，并利用 SIMD 风格数组进行快速距离过滤
   */
  query(x: number, z: number, range: number, mask: number = 0xFFFFFFFF, out?: Entity[], allowFallback: boolean = false): Entity[] {
    this.debugStats.queryCount++
    
    // 零分配优化：如果外部没传 out，使用内部复用的 internalQueryResult
    const results = out || this.internalQueryResult
    results.length = 0
    
    const worldX = x + this.BOUNDS_X
    const worldZ = z + this.BOUNDS_Z

    const startX = Math.max(0, worldX - range)
    const endX = Math.min(this.MAP_SIZE_X - 0.01, worldX + range)
    const startZ = Math.max(0, worldZ - range)
    const endZ = Math.min(this.MAP_SIZE_Z - 0.01, worldZ + range)
    
    // 强制转换为 number 以修复 TS 类型检查 (linter 误报)
    const sX2 = Math.floor(startX / this.L2_CELL_SIZE)
    const eX2 = Math.floor(endX / this.L2_CELL_SIZE)
    const sZ2 = Math.floor(startZ / this.L2_CELL_SIZE)
    const eZ2 = Math.floor(endZ / this.L2_CELL_SIZE)

    const rangeSq = range * range;

    for (let ix2 = sX2; ix2 <= eX2; ix2++) {
      for (let iz2 = sZ2; iz2 <= eZ2; iz2++) {
        const l2Idx = Math.floor(ix2 * this.L2_COUNT_Z + iz2)
        const l2Val = this.l2Blackboard[l2Idx]

        if (!(l2Val & mask)) continue

        const sX1 = Math.max(Math.floor(startX / this.L1_CELL_SIZE), ix2 * 5)
        const eX1 = Math.min(Math.floor(endX / this.L1_CELL_SIZE), (ix2 + 1) * 5 - 1)
        const sZ1 = Math.max(Math.floor(startZ / this.L1_CELL_SIZE), iz2 * 5)
        const eZ1 = Math.min(Math.floor(endZ / this.L1_CELL_SIZE), (iz2 + 1) * 5 - 1)

        for (let ix1 = sX1; ix1 <= eX1; ix1++) {
          for (let iz1 = sZ1; iz1 <= eZ1; iz1++) {
            const l1Idx = ix1 * this.L1_COUNT_Z + iz1
            const l1Val = this.l1Blackboard[l1Idx]

            if (!(l1Val & mask)) continue

            const cellBuckets = this.l1Buckets[l1Idx]
            
            for (let catIdx = 0; catIdx < NUM_CATEGORIES; catIdx++) {
              const catBit = 1 << catIdx;
              if (catBit & mask) {
                const bucket = cellBuckets[catIdx];
                for (let k = 0; k < bucket.length; k++) {
                  const ent = bucket[k];
                  const pIdx = this.entityPoolIndices.get(ent.id as any);
                  
                  if (pIdx !== undefined) {
                    // --- SIMD 风格快速距离判定 ---
                    const dx = this.poolX[pIdx] - x;
                    const dz = this.poolZ[pIdx] - z;
                    if (dx * dx + dz * dz <= rangeSq) {
                      this.debugStats.candidateCount++;
                      results.push(ent);
                    }
                  } else {
                    // 回退到普通判定
                    const dx = ent.position.x - x;
                    const dz = ent.position.z - z;
                    if (dx * dx + dz * dz <= rangeSq) {
                      results.push(ent);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (results.length === 0 && allowFallback) {
      this.debugStats.fallbackCount++;
      for (let catIdx = 0; catIdx < NUM_CATEGORIES; catIdx++) {
        if ((1 << catIdx) & mask) {
          const bucket = this.globalBuckets[catIdx];
          
          // 如果全局桶里有东西，至少保证返回一个最近的或全部，
          // 但原逻辑是“回退到全局扫描”，如果全局扫描依然带距离判定，
          // 在极端情况下（所有人都超出了 range）依然会返回空。
          // 这里的“兜底”逻辑修改为：如果全局扫描后依然为空，则忽略距离判定，直接给最近的一个。
          
          let closestEnt: Entity | null = null;
          let minDsq = Infinity;

          for (let k = 0; k < bucket.length; k++) {
            const ent = bucket[k];
            const dx = ent.position.x - x;
            const dz = ent.position.z - z;
            const dsq = dx * dx + dz * dz;

            if (dsq <= rangeSq) {
              results.push(ent);
            }

            if (dsq < minDsq) {
              minDsq = dsq;
              closestEnt = ent;
            }
          }

          // 兜底：如果范围内真的没人，但要求回退，则返回全局最近的一个
          if (results.length === 0 && closestEnt) {
            results.push(closestEnt);
          }
        }
      }
    }

    return results
  }
}

export const spatialHash = new SpatialHash()
