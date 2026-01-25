import { World } from 'miniplex'
import { UNITS } from '../data/units'
import { COMBAT_STYLES } from '../data/combatConfig'

// --- 组件定义 (拆装式属性) ---

export type Position = { x: number; y: number; z: number }
export type Velocity = { x: number; y: number; z: number }
export type Health = { 
  current: number; 
  max: number;
  lastHitTime?: number; // 记录上一次受击的时间戳
}
export type Attack = { 
  power: number; 
  speed: number; 
  range: number; 
  knockback: number; 
  styleId: string; // 唯一起点：战斗风格 ID
  burst?: number;
  burstInterval?: number;
}

export type VisualEffect = {
  id: string;
  type: 'slash' | 'arrow' | 'burst';
  startTime: number;
  duration: number;
  position: Position;
  targetPos?: Position;
}

export type Entity = {
  id: string
  type: 'player' | 'enemy' | 'ally' | 'bullet' | 'effect' | 'spectator'
  unitId?: string
  
  // 核心组件
  position: Position
  velocity: Velocity      // 物理速度 (击退、碰撞产生的合力)
  moveIntent: Velocity    // 移动意图 (玩家输入或 AI 驱动的方向)
  quaternion?: { x: number; y: number; z: number; w: number }
  health: Health
  
  // 战斗状态组件
  attack?: Attack
  lastAttackTime?: number;
  lastAttackAngle?: number; // 新增：记录最后一次攻击的方向角
  burstRemaining?: number; // 连发剩余次数
  lastBurstTime?: number; // 上一次连发的时间戳
  currentTargetId?: string; // 新增：当前锁定的目标 ID
  
  // 弹道逻辑组件
    projectile?: {
      damage: number;
      speed: number;
      pierce: number;
      maxPierce: number;
      ownerId: string;
      targetId?: string; 
      hitEntities: Map<string, number>; // 修改：从 Set 改为 Map<targetId, lastHitTime>
      hitInterval: number; // 新增：对同一个目标再次造成伤害的间隔 (秒)
      lifeTime: number; 
      styleId: string; // 新增：记录战斗风格 ID
      trackingCooldown?: number; // 新增：命中后的追踪冷却时间 (秒)
    };

  // 基础组件
  lifetime?: { remaining: number }; // 通用生命周期：倒计时结束自动销毁
  
  // 物理组件
  physics?: {
    damping: number;    // 阻尼 (0-1)，决定物理速度衰减快慢
    isGrounded: boolean;
    mass: number;       // 质量，影响被推开的力度
  }
  
  // 特效专用组件
  effect?: {
    type: 'slash' | 'arrow' | 'burst' | 'air_sword'; // 新增 air_sword
    startTime: number;
    duration: number;
    angle?: number; // 平面方向角
    attackerPos?: Position; 
    targetPos?: Position;
    attackerType?: 'player' | 'enemy' | 'ally'; // 新增：记录攻击者类型
    length?: number;
  };
  
  ai?: { 
    behavior: 'chase' | 'flee' | 'idle'; 
    targetId?: string;
  }
  input?: boolean
  stats?: { 
    speedMult: number; 
    luck?: number;
    baseSpeed: number; // 基础移动速度
    radius: number;    // 碰撞半径
  }
  
  dead?: boolean
  deathTime?: number; // 死亡发生的时间戳
  deathDir?: { x: number; y: number; z: number }; // 死亡受力方向
  
  facingFlip?: boolean; // 新增：记忆实体的翻转状态
  visualFlip?: number;  // 新增：平滑渲染使用的翻转比例 (-1 到 1)
  lastMoveX?: number;   // 新增：记录最后一次移动的世界坐标 X
  lastMoveZ?: number;   // 新增：记录最后一次移动的世界坐标 Z
  
  animOffset?: number;  // 新增：随机动画相位偏移
  
  spawnTimer?: number;  // 新增：出生预警倒计时 (秒)
  
  money?: {
    amount: number;
    collected?: boolean;
  };
  
  // 伤害飘字组件
  damageDigit?: {
    value: number;      // 0-9 的单个数字
    offset: number;     // 水平偏移 (用于多位数排版)
    totalWidth: number; // 总宽度 (用于居中)
    startTime: number;  // 产生时间
  };

  _shCategory?: number; // 空间哈希内部使用的类别标签 (性能优化)
}

// 创建全局唯一的 ECS 世界
export const world = new World<Entity>()

// --- 全局实体 ID 索引 (性能优化) ---
// 允许以 O(1) 的复杂度根据 ID 查找实体，避免在系统循环中使用 .find()
export const entityMap = new Map<string, Entity>()

// 监听实体添加和移除，自动维护索引
world.onEntityAdded.subscribe((entity) => {
  entityMap.set(entity.id, entity)
})

world.onEntityRemoved.subscribe((entity) => {
  entityMap.delete(entity.id)
})

// --- 预定义查询 (智能索引) ---
// 这样在系统中就不需要每次 filter，框架会自动维护这些集合
export const queries = {
  players: world.with('type').where(e => e.type === 'player'),
  enemies: world.with('type').where(e => e.type === 'enemy'),
  allies: world.with('type').where(e => e.type === 'ally'),
  // 阵营大集合 (排除已死亡实体，提升逻辑层性能)
  combatants: world.with('type', 'health', 'position').without('dead'),
  effects: world.with('effect'),
  projectiles: world.with('projectile', 'position', 'velocity'),
  damageDigits: world.with('damageDigit', 'position'),
  movable: world.with('position', 'velocity').without('dead'),
  // 物理交互池：仅包含玩家、敌人、盟友、金币、弹道。彻底排除观众和纯特效。
  physical: world.with('position', 'type').where(e => 
    e.type === 'player' || e.type === 'enemy' || e.type === 'ally' || e.type === 'bullet'
  ).without('dead'),
}

// --- 极致安全的对象池管理器 ---
const entityPools = {
  damageDigit: [] as Entity[],
  gold: [] as Entity[]
};

/**
 * 辅助函数：生成伤害飘字 (安全池化版)
 * 职责：将伤害数值拆分为单个数字实体，实现高性能实例化排版
 */
export function spawnDamageText(value: number, position: Position) {
  const str = Math.floor(value).toString()
  const totalWidth = str.length
  const now = performance.now() / 1000

  for (let i = 0; i < str.length; i++) {
    // 优先从池子取
    let e = entityPools.damageDigit.pop();
    
    // 核心安全策略：所有属性必须显式覆盖，确保没有“上辈子”的残留
    const digitData: Partial<Entity> = {
      id: `damage-${now}-${i}-${Math.random()}`, // 必须生成新 ID 以兼容空间哈希
      type: 'effect',
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: 0, y: 0, z: 0 },
      health: { current: 1, max: 1 },
      lifetime: { remaining: 0.8 },
      damageDigit: {
        value: parseInt(str[i]),
        offset: i,
        totalWidth: totalWidth,
        startTime: now
      },
      dead: false // 显式重置死亡状态
    };

    if (e) {
      // 安全复用：彻底覆盖旧数据
      Object.assign(e, digitData);
      // 重新加入世界（如果之前被移出了）
      world.add(e);
    } else {
      world.add(digitData as Entity);
    }
  }
}

/**
 * 辅助函数：生成金币 (安全池化版)
 * 职责：在指定位置生成可吸附的金币实体
 */
export function spawnGold(position: Position, amount: number = 1) {
  const now = performance.now() / 1000;
  
  // 每次掉落 1-3 枚金币，视觉效果更好
  const count = Math.min(3, amount);
  const valuePerCoin = Math.ceil(amount / count);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = 1.5 + Math.random() * 2;
    const style = COMBAT_STYLES['gold_coin'];
    
    let e = entityPools.gold.pop();
    
    const goldData: Partial<Entity> = {
      id: `gold-${now}-${i}-${Math.random()}`, // 新 ID
      type: 'bullet', // 借用弹道类型以复用 ProjectileSystem
      animOffset: Math.random() * 10,
      position: { 
        x: position.x, 
        y: position.y + 0.5, 
        z: position.z 
      },
      velocity: { 
        x: Math.cos(angle) * force, 
        y: 5 + Math.random() * 3, // 向上喷射
        z: Math.sin(angle) * force 
      },
      moveIntent: { x: 0, y: 0, z: 0 },
      health: { current: 1, max: 1 },
      money: { amount: valuePerCoin, collected: false }, // 彻底重置采集状态
      projectile: {
        damage: 0,
        speed: 0, // 初始静止（由 velocity 控制喷射）
        pierce: 99,
        maxPierce: 99,
        ownerId: 'world',
        hitEntities: new Map(),
        hitInterval: style?.hitInterval || 0.1,
        lifeTime: 15.0, // 15秒后消失
        styleId: 'gold_coin',
      },
      effect: {
        type: 'gold_coin' as any,
        startTime: now,
        duration: 15.0,
      },
      physics: {
        damping: 0.95,
        isGrounded: false,
        mass: 1
      },
      dead: false
    };

    if (e) {
      Object.assign(e, goldData);
      world.add(e);
    } else {
      world.add(goldData as Entity);
    }
  }
}

/**
 * 核心回收系统：在主循环中调用，将过期的实体安全送回池子
 */
export function entityRecycleSystem() {
  // 1. 回收伤害飘字
  for (const e of queries.damageDigits.entities) {
    if (e.lifetime && e.lifetime.remaining <= 0) {
      world.remove(e);
      entityPools.damageDigit.push(e);
    }
  }
  
  // 2. 回收金币 (包括被采集的和过期的)
  for (const e of queries.projectiles.entities) {
    if (e.money) {
      const isCollected = e.money.collected;
      const isExpired = e.projectile && e.projectile.lifeTime <= 0;
      
      if (isCollected || isExpired) {
        world.remove(e);
        entityPools.gold.push(e);
      }
    }
  }
}
