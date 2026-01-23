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
      x: 35,
      z: 35
    },
    SPAWN_INTERVAL: 0.025,      // 刷怪速度加快100倍 (原2.5秒)
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

  // 物理模拟相关
  PHYSICS: {
    DEFAULT_DAMPING: 0.92,      // 默认阻尼 (0.9-0.95 较有滑行感)
    STOP_THRESHOLD: 0.01,      // 速度低于此值时强制归零
    GRAVITY: 20,               // 重力加速度
    MAX_VELOCITY: 50,          // 最大物理速度限制
    COLLISION_HARDNESS: 0.5,   // 基础碰撞硬度
    MOMENTUM_TRANSFER: 0.6,    // 动量传递比例 (保龄球效果)
    TARGET_STICKY_DISTANCE: 3, // 索敌粘滞距离 (米)
    AI_TICK_RATE: 0.3,         // AI 决策频率 (秒)
    // 友军/保镖 AI 相关
    ALLY_LEASH_DISTANCE: 20,   // 强制回归距离
    ALLY_COMBAT_RADIUS: 12,     // 战斗半径
    ALLY_IDLE_RADIUS: 5,       // 闲置跟随半径
  },

  // 竞技场布局相关
  ARENA: {
    STANDS: [
      { id: 'north', center: [0, 0, 110], size: [940, 20, 100] }, // 基于 bx=35, bz=35 计算: (bx*2+150)*2 = 440*2 = 880? 不对，原代码是 (bx*2+150)*2
      { id: 'south', center: [0, 0, -110], size: [940, 20, 100] },
      { id: 'east', center: [110, 0, 0], size: [100, 20, 940] },
      { id: 'west', center: [-110, 0, 0], size: [100, 20, 940] },
    ],
    LEVEL_HEIGHT: 3,
    LEVEL_COUNT: 10,
    BASE_Y: -2,
  },
  
  // 关卡/波次配置
  WAVES: {
    1: { 
      pool: ['bandit', 'archer'] as const, 
      count: 5000, // 大幅提升上限，用于压力测试
      theme: 'grassland' as const 
    },
    2: { 
      pool: ['bandit', 'archer'] as const, 
      count: 5000, 
      theme: 'desert' as const 
    }
  },
  
  // 视觉/渲染相关
  VISUAL: {
    GRID_SIZE: 2.0,           // 空间哈希网格大小
    CAMERA_MODE: 'ORBIT' as 'TPS' | 'ORBIT', // 新增：控制模式
    PIXEL_UNIT: 0.05,          
    CAMERA_OFFSET: [0, 8, 15] as [number, number, number],
    // 相机与动画参数
    CAMERA_LERP: 0.1,
    ZOOM_LERP: 0.1,
    ZOOM_MIN: 5,
    ZOOM_MAX: 25,
    ZOOM_SENSITIVITY: 0.01,
    // 相机俯仰角限制 (弧度)
    CAMERA_MIN_POLAR: Math.PI * (45 / 180),    // 限制在 45 度，防止拉得太高
    CAMERA_MAX_POLAR: Math.PI * (89.9 / 180),  // 接近 90 度，允许几乎水平观察
    // 角色动画参数
    ANIM_BOUNCE_FREQ: 8,
    ANIM_BOUNCE_AMP: 0.12,
    ANIM_TILT_AMP: 0.08,
    HIT_FLASH_DURATION: 0.07, // 缩短受击闪烁时长 (原 0.15)
    FACING_FLIP_DURATION: 0.2, // 角色翻转动画时长 (秒)
    FACING_HYSTERESIS: 0.5,   // 意图过滤时长 (秒)
  },
  
  // 环境配置 (支持多场景切换)
  THEMES: {
    'grassland': {
      groundColor: '#d4b483', // 恢复为原本的土黄色 (宣纸/夯土感)
      gridColor: '#c4a473',   
      skyColor: '#f5efe6',    
      ambientIntensity: 0.6,  
      fog: { color: '#f5efe6', near: 100, far: 300 } 
    },
    'desert': {
      groundColor: '#e2bc8a', // 干燥沙土色
      gridColor: '#d2ac7a',
      skyColor: '#fff4e0',
      ambientIntensity: 0.6,
      fog: { color: '#fff4e0', near: 40, far: 150 }
    }
  },
  
  // 颜色 (同步 Tailwind 配置)
  COLORS: {
    GOLD: '#d4af37',
    INK: '#1a1a1a',
    VERMILION: '#e34234',
  }
}
