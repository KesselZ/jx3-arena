export const SPRITE_SHEETS = {
  'enemy': { path: '/assets/enemies/enemy.png', rows: 4, cols: 4 },
  'player': { path: '/assets/characters/chunyang.png', rows: 4, cols: 4 },
  'wanhua': { path: '/assets/characters/wanhua.png', rows: 4, cols: 4 },
  'tiance4': { path: '/assets/characters/tiance4.png', rows: 4, cols: 4 },
  'chunyang': { path: '/assets/characters/chunyang.png', rows: 4, cols: 4 },
};

export interface UnitConfig {
  sheet: keyof typeof SPRITE_SHEETS;
  row: number;
  col: number;
  name: string;
  anchor: 'bottom' | 'center';
  isPlayable: boolean;
  description?: string;
  scale: number;
  facing?: 'left' | 'right';
  combat: {
    attackType: 'melee' | 'ranged';
    vfxType: 'slash' | 'arrow' | 'burst' | 'air_sword';
    range: number;
    speed: number; // 攻击速度 (每秒攻击次数)
    power: number; // 攻击力
    knockback: number; // 击退强度
    burst?: number; // 连发次数 (例如 3 连发)
    burstInterval?: number; // 连发间隔 (秒)
  };
  movement: {
    speed: number; // 移动速度 (单位/秒)
  };
  radius?: number; // 碰撞半径 (可选，默认 0.5)
}

export const UNITS: Record<string, UnitConfig> = {
  // 玩家角色
  'player_wanhua': { 
    sheet: 'wanhua', row: 2, col: 0, name: '万花师兄', 
    anchor: 'bottom',
    isPlayable: true, description: '妙手空空，笔墨定乾坤。',
    scale: 1.5,
    combat: {
      attackType: 'ranged',
      vfxType: 'air_sword',
      range: 12.0,
      speed: 1.5,
      power: 20,
      knockback: 100,
      burst: 3,
      burstInterval: 0.1
    },
    movement: {
      speed: 6.0
    }
  },
  'player_tiance': { 
    sheet: 'tiance4', row: 1, col: 0, name: '天策师兄', 
    anchor: 'bottom',
    isPlayable: true, description: '长枪所向，东都之狼。',
    scale: 1.6,
    combat: {
      attackType: 'melee',
      vfxType: 'slash',
      range: 0.5,
      speed: 1.2,
      power: 25,
      knockback: 100
    },
    movement: {
      speed: 5.5
    }
  },
  
  // 友军
  'ally_chunyang': { 
    sheet: 'chunyang', row: 0, col: 0, name: '纯阳弟子', 
    anchor: 'bottom',
    isPlayable: false,
    scale: 1.2,
    combat: {
      attackType: 'melee',
      vfxType: 'slash',
      range: 0.3,
      speed: 1.0,
      power: 10,
      knockback: 1.5
    },
    movement: {
      speed: 4.5
    }
  },

  // 敌人
  'bandit': { 
    sheet: 'enemy', row: 1, col: 0, name: '山贼', 
    facing: 'left', anchor: 'bottom',
    isPlayable: false,
    scale: 1.2,
    combat: {
      attackType: 'melee',
      vfxType: 'slash',
      range: 0.3,
      speed: 1.2,
      power: 8,
      knockback: 1.2
    },
    movement: {
      speed: 4.0
    }
  },
  'archer': { 
    sheet: 'enemy', row: 1, col: 1, name: '山贼射手', 
    anchor: 'bottom',
    isPlayable: false,
    scale: 1.1,
    combat: {
      attackType: 'ranged',
      vfxType: 'arrow',
      range: 10.0,
      speed: 0.4, // 降低基础攻速，因为有连发
      power: 5,
      knockback: 0.5,
      burst: 3, // 三连发
      burstInterval: 0.15 // 连发间隔 0.15s
    },
    movement: {
      speed: 3.5
    }
  },
};
