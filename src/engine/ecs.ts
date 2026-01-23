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
  knockback: number; // 新增：攻击自带的击退强度
  type: 'melee' | 'ranged';
  vfxType: 'slash' | 'arrow' | 'burst'; // 明确攻击产生的特效类型
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
    type: 'slash' | 'arrow' | 'burst';
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
    targetId?: string 
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
}

// 创建全局唯一的 ECS 世界
export const world = new World<Entity>()

// --- 预定义查询 (智能索引) ---
// 这样在系统中就不需要每次 filter，框架会自动维护这些集合
export const queries = {
  players: world.with('type').where(e => e.type === 'player'),
  enemies: world.with('type').where(e => e.type === 'enemy'),
  allies: world.with('type').where(e => e.type === 'ally'),
  // 阵营大集合 (排除已死亡实体，提升逻辑层性能)
  combatants: world.with('type', 'health', 'position').without('dead'),
  effects: world.with('effect'),
  movable: world.with('position', 'velocity').without('dead')
}
