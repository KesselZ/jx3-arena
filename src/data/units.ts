import { COMBAT_STYLES } from './combatConfig';

export const SPRITE_SHEETS = {
  'enemy': { path: '/assets/enemies/enemy.png', rows: 4, cols: 4 },
  'player': { path: '/assets/characters/chunyang.png', rows: 4, cols: 4 },
  'wanhua': { path: '/assets/characters/wanhua.png', rows: 4, cols: 4 },
  'tiance4': { path: '/assets/characters/tiance4.png', rows: 4, cols: 4 },
  'tiance2': { path: '/assets/characters/tiance2.png', rows: 4, cols: 4 },
  'tiance': { path: '/assets/characters/tiance.png', rows: 4, cols: 4 },
  'chunyang': { path: '/assets/characters/chunyang.png', rows: 4, cols: 4 },
  'chunyang3': { path: '/assets/characters/chunyang3.png', rows: 4, cols: 4 },
};

export interface UnitConfig {
  sheet: keyof typeof SPRITE_SHEETS;
  row: number;
  col: number;
  name: string;
  anchor: 'bottom' | 'center';
  isPlayable: boolean;
  scale: number;
  facing?: 'left' | 'right';
  combat: {
    styleId: keyof typeof COMBAT_STYLES; // 唯一起点：战斗风格 ID
    range: number;
    speed: number; 
    power: number; 
    knockback: number; 
    burst?: number; 
    burstInterval?: number; 
    projectile?: {
      speed: number;
      pierce: number;
      logic: 'straight' | 'tracking';
      lifeTime: number;
    };
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
    isPlayable: true,
    scale: 1.5,
    combat: {
      styleId: 'air_sword',
      range: 12.0,
      speed: 1.5,
      power: 20,
      knockback: 100,
      burst: 3,
      burstInterval: 0.1,
      projectile: {
        speed: 25,
        pierce: 999,
        logic: 'tracking',
        lifeTime: 2.0
      }
    },
    movement: {
      speed: 30.0
    }
  },
  'player_tiance': { 
    sheet: 'tiance4', row: 1, col: 0, name: '天策师兄', 
    anchor: 'bottom',
    isPlayable: true,
    scale: 1.6,
    combat: {
      styleId: 'slash',
      range: 0.5,
      speed: 1.2,
      power: 25,
      knockback: 100
    },
    movement: {
      speed: 30.0
    }
  },
  'player_chunyang_senior': { 
    sheet: 'chunyang3', row: 2, col: 0, name: '纯阳师兄', 
    anchor: 'bottom',
    isPlayable: true,
    scale: 1.5,
    combat: {
      styleId: 'air_sword',
      range: 12.0,
      speed: 1.6,
      power: 22,
      knockback: 110,
      burst: 4,
      burstInterval: 0.08,
      projectile: {
        speed: 28,
        pierce: 999,
        logic: 'tracking',
        lifeTime: 2.0
      }
    },
    movement: {
      speed: 32.0
    }
  },
  'player_tangmen_senior': { 
    sheet: 'tiance2', row: 1, col: 1, name: '唐门师兄', 
    anchor: 'bottom',
    isPlayable: true,
    scale: 1.5,
    combat: {
      styleId: 'arrow', // 切换为箭矢风格
      range: 12.0,
      speed: 1.8,
      power: 35,
      knockback: 80,
      burst: 1,
      projectile: {
        speed: 40,      // 暗器速度极快
        pierce: 999,    // 几乎无限穿透
        logic: 'straight',
        lifeTime: 1.5
      }
    },
    movement: {
      speed: 35.0
    }
  },
  'player_badao_senior': { 
    sheet: 'tiance', row: 0, col: 3, name: '霸刀师兄', 
    anchor: 'bottom',
    isPlayable: true,
    scale: 1.6,
    combat: {
      styleId: 'air_sword',
      range: 10.0,
      speed: 1.2,
      power: 35,
      knockback: 150,
      burst: 2,
      burstInterval: 0.2,
      projectile: {
        speed: 22,
        pierce: 999,
        logic: 'tracking',
        lifeTime: 2.5
      }
    },
    movement: {
      speed: 28.0
    }
  },
  
  // 友军
  'ally_chunyang': { 
    sheet: 'chunyang', row: 0, col: 0, name: '纯阳弟子', 
    anchor: 'bottom',
    isPlayable: false,
    scale: 1.2,
    combat: {
      styleId: 'slash',
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
      styleId: 'slash',
      range: 0.3,
      speed: 1.2,
      power: 18,
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
      styleId: 'arrow',
      range: 10.0,
      speed: 0.4, 
      power: 15,
      knockback: 0.5,
      burst: 3, 
      burstInterval: 0.15, 
      projectile: {
        speed: 20,
        pierce: 5,
        logic: 'straight',
        lifeTime: 2.0
      }
    },
    movement: {
      speed: 3.5
    }
  },
};
