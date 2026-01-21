/**
 * 游戏全局数值配置文件
 * 所有的平衡性调整都应在此进行
 */
export const GAME_CONFIG = {
  // 战斗相关
  BATTLE: {
    WAVE_DURATION: 30,         // 每波时间 (秒)
    PLAYER_INITIAL_SPEED: 5,   // 玩家初始速度
    SCREEN_BOUNDS: {           // 战斗区域限制
      x: 15,
      z: 10
    },
    SPAWN_INTERVAL: 2.5,       // 每隔多久生成一次怪物 (秒)
    INITIAL_ENEMIES: 3,        // 开局立即生成的怪物数量
  },
  
  // 关卡/波次配置
  WAVES: {
    1: { 
      pool: ['bandit', 'archer'] as const, 
      count: 15, // 总共会生成的数量
      theme: 'grassland' as const 
    },
    2: { 
      pool: ['bandit', 'archer'] as const, 
      count: 25, 
      theme: 'desert' as const 
    }
  },
  
  // 视觉/渲染相关
  VISUAL: {
    PIXEL_UNIT: 0.05,          // 像素单位大小
    CAMERA_OFFSET: [0, 12, 12] as [number, number, number],
  },
  
  // 环境配置 (支持多场景切换)
  THEMES: {
    'grassland': {
      groundColor: '#4a7c44',
      gridColor: '#3d6638',
      skyColor: '#87ceeb',
      ambientIntensity: 0.8,
      fog: { color: '#87ceeb', near: 10, far: 50 }
    },
    'desert': {
      groundColor: '#c2b280',
      gridColor: '#a8996d',
      skyColor: '#ffdb58',
      ambientIntensity: 0.6,
      fog: { color: '#ffdb58', near: 10, far: 50 }
    }
  },
  
  // 颜色 (同步 Tailwind 配置)
  COLORS: {
    GOLD: '#d4af37',
    INK: '#1a1a1a',
    VERMILION: '#e34234',
  }
}
