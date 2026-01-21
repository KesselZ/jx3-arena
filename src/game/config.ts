/**
 * 游戏全局数值配置文件
 * 所有的平衡性调整都应在此进行
 */
export const GAME_CONFIG = {
  // 开发调试相关
  DEBUG: import.meta.env.DEV,

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
    TARGET_STICKY_MULT: 1.5,   // 索敌粘性倍率 (射程的倍数)
    DEATH_DURATION: 0.6,       // 死亡动画总长
    DEATH_JUMP_HEIGHT: 1.5,    // 死亡弹跳高度
    DEATH_KNOCKBACK: 2.5,      // 死亡击退距离
    ATTACK_LUNGE_DURATION: 0.2, // 攻击冲刺时长
    ATTACK_LUNGE_FORCE: 0.5,   // 攻击冲刺力度
    MELEE_VFX_PUSH: 0.8,       // 近战特效身前偏移
    MAX_INSTANCES_PER_TYPE: 1000, // 每种兵种的最大实例数 (同屏上限)
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
    PIXEL_UNIT: 0.05,          
    CAMERA_OFFSET: [0, 8, 15] as [number, number, number],
    // 相机与动画参数
    CAMERA_LERP: 0.1,
    ZOOM_LERP: 0.1,
    ZOOM_MIN: 5,
    ZOOM_MAX: 25,
    ZOOM_SENSITIVITY: 0.01,
    // 相机俯仰角限制 (弧度)
    CAMERA_MIN_POLAR: Math.PI * (55 / 180), // 55度
    CAMERA_MAX_POLAR: Math.PI * (85 / 180), // 85度
    // 角色动画参数
    ANIM_BOUNCE_FREQ: 8,
    ANIM_BOUNCE_AMP: 0.12,
    ANIM_TILT_AMP: 0.08,
    HIT_FLASH_DURATION: 0.15, // 延长受击变红时长，增加视觉反馈
  },
  
  // 环境配置 (支持多场景切换)
  THEMES: {
    'grassland': {
      groundColor: '#1a2e1a', // 深墨绿色
      gridColor: '#0d1a0d',
      skyColor: '#050a0f',    // 深夜蓝
      ambientIntensity: 0.1,  // 极低环境光，突出灯光
      fog: { color: '#050a0f', near: 20, far: 60 } 
    },
    'desert': {
      groundColor: '#2a2418', // 深褐色
      gridColor: '#1a160e',
      skyColor: '#0f0a05',
      ambientIntensity: 0.1,
      fog: { color: '#0f0a05', near: 15, far: 45 }
    }
  },
  
  // 颜色 (同步 Tailwind 配置)
  COLORS: {
    GOLD: '#d4af37',
    INK: '#1a1a1a',
    VERMILION: '#e34234',
  }
}
