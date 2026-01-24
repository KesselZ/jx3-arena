import { World } from 'miniplex'
import { UNITS } from '../data/units'

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
      hitEntities: Set<string>; 
      lifeTime: number; 
      styleId: string; // 新增：记录战斗风格 ID
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
  movable: world.with('position', 'velocity').without('dead')
}

/**
 * 辅助函数：生成伤害飘字
 * 职责：将伤害数值拆分为单个数字实体，实现高性能实例化排版
 */
export function spawnDamageText(value: number, position: Position) {
  const str = Math.floor(value).toString()
  const totalWidth = str.length
  const now = performance.now() / 1000

  for (let i = 0; i < str.length; i++) {
    world.add({
      id: `damage-${now}-${Math.random()}`,
      type: 'effect',
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      health: { current: 1, max: 1 },
      lifetime: { remaining: 0.8 },
      damageDigit: {
        value: parseInt(str[i]),
        offset: i,
        totalWidth: totalWidth,
        startTime: now
      }
    })
  }
}

/**
 * 辅助函数：生成金币
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
    
    world.add({
      id: `gold-${now}-${Math.random()}`,
      type: 'bullet', // 借用弹道类型以复用 ProjectileSystem
      animOffset: Math.random() * 10, // 新增：随机动画相位偏移
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
      money: { amount: valuePerCoin },
      projectile: {
        damage: 0,
        speed: 0, // 初始静止（由 velocity 控制喷射）
        pierce: 99,
        maxPierce: 99,
        ownerId: 'world',
        hitEntities: new Set(),
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
      }
    });
  }
}
