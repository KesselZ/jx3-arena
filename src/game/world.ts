import { World } from 'miniplex'
import { UNITS } from '../assets/assets'

// --- 组件定义 (拆装式属性) ---

export type Position = { x: number; y: number; z: number }
export type Velocity = { x: number; y: number; z: number }
export type Health = { current: number; max: number }
export type Attack = { power: number; speed: number; range: number; type: 'melee' | 'ranged' }

export type Entity = {
  id: string
  type: 'player' | 'enemy' | 'ally' | 'bullet'
  unitId: keyof typeof UNITS
  
  // 核心组件 (大多数实体共有)
  position: Position
  velocity: Velocity
  health: Health
  
  // 可选逻辑组件 (决定实体的特殊行为)
  attack?: Attack
  ai?: { 
    behavior: 'chase' | 'flee' | 'idle'; 
    targetId?: string 
  }
  input?: boolean      // 标记是否受玩家输入控制
  stats?: { 
    speedMult: number; 
    luck: number 
  }
  
  dead?: boolean
}

// 创建全局唯一的 ECS 世界
export const world = new World<Entity>()
