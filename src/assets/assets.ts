import * as THREE from 'three';

// --- 1. 数据配置 (Registry) ---
export const SPRITE_SHEETS = {
  'enemy': { path: '/assets/enemies/enemy.png', rows: 4, cols: 4 },
  'player': { path: '/assets/characters/chunyang.png', rows: 4, cols: 4 },
  'wanhua': { path: '/assets/characters/wanhua.png', rows: 4, cols: 4 },
  'tiance4': { path: '/assets/characters/tiance4.png', rows: 4, cols: 4 },
  'chunyang': { path: '/assets/characters/chunyang.png', rows: 4, cols: 4 },
};

export const UNITS = {
  // 玩家角色
  'player_wanhua': { 
    sheet: 'wanhua', row: 2, col: 0, name: '万花师兄', 
    anchor: 'bottom',
    isPlayable: true, description: '妙手空空，笔墨定乾坤。',
    scale: 1.5
  },
  'player_tiance': { 
    sheet: 'tiance4', row: 1, col: 0, name: '天策师兄', 
    anchor: 'bottom',
    isPlayable: true, description: '长枪所向，东都之狼。',
    scale: 1.6
  },
  
  // 友军
  'ally_chunyang': { 
    sheet: 'chunyang', row: 0, col: 0, name: '纯阳弟子', 
    anchor: 'bottom',
    isPlayable: false,
    scale: 1.2
  },

  // 敌人
  'bandit': { 
    sheet: 'enemy', row: 1, col: 0, name: '山贼', 
    facing: 'left', anchor: 'bottom', // 只有面朝左的需要特殊声明
    isPlayable: false,
    scale: 1.2
  },
  'archer': { 
    sheet: 'enemy', row: 1, col: 1, name: '山贼射手', 
    anchor: 'bottom',
    isPlayable: false,
    scale: 1.1
  },
} as const;

// --- 2. 核心逻辑 (The Engine) ---
const baseTextureCache: Record<string, THREE.Texture> = {};
const finalTextureCache: Record<string, { texture: THREE.Texture, width: number, height: number, anchorY: number }> = {};

export const Assets = {
  /**
   * 采用“图集克隆 + 像素预探测”模式：
   * 1. 共享大图纹理，确保合批。
   * 2. 预先扫描像素，算出脚底位置（anchorY），供渲染层进行视觉补偿。
   */
  getTexture: async (unitId: keyof typeof UNITS): Promise<{ texture: THREE.Texture, width: number, height: number, anchorY: number }> => {
    if (finalTextureCache[unitId]) return finalTextureCache[unitId];

    const unit = UNITS[unitId];
    const sheet = SPRITE_SHEETS[unit.sheet as keyof typeof SPRITE_SHEETS];

    // 1. 加载基础大图
    if (!baseTextureCache[unit.sheet]) {
      const loader = new THREE.TextureLoader();
      const baseTex = await loader.loadAsync(sheet.path);
      baseTex.minFilter = baseTex.magFilter = THREE.NearestFilter;
      baseTextureCache[unit.sheet] = baseTex;
    }

    const baseTex = baseTextureCache[unit.sheet];
    const img = baseTex.image;
    const cw = img.width / sheet.cols;
    const ch = img.height / sheet.rows;

    // 2. 核心：预扫描像素探测脚底 (anchorY)
    // 我们在内存里临时画一下这一帧，探测它的实际像素边界
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cw; tempCanvas.height = ch;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
    tempCtx.drawImage(img, unit.col * cw, unit.row * ch, cw, ch, 0, 0, cw, ch);
    
    const pixelData = tempCtx.getImageData(0, 0, cw, ch).data;
    let lastVisibleY = ch; // 默认最底部
    for (let i = pixelData.length - 1; i >= 3; i -= 4) {
      if (pixelData[i] > 30) { // 透明度阈值
        const py = Math.floor((i / 4) / cw);
        lastVisibleY = py;
        break; // 从下往上找，找到第一个非透明像素就停
      }
    }
    // 算出脚底占整个切片高度的比例 (0 = 顶部, 1 = 底部)
    const anchorY = lastVisibleY / ch;

    // 3. 克隆纹理（共享显存）
    const tex = baseTex.clone();
    tex.repeat.set(1 / sheet.cols, 1 / sheet.rows);
    tex.offset.set(unit.col / sheet.cols, (sheet.rows - 1 - unit.row) / sheet.rows);
    tex.needsUpdate = true;

    const result = { texture: tex, width: cw, height: ch, anchorY };
    finalTextureCache[unitId] = result;
    return result;
  },

  /**
   * UI 专用：获取 CSS 背景样式 (直接使用原始路径，效率最高)
   */
  getCSS: (unitId: keyof typeof UNITS) => {
    const unit = UNITS[unitId];
    const sheet = SPRITE_SHEETS[unit.sheet];
    return {
      backgroundImage: `url(${sheet.path})`,
      backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
      backgroundPosition: `${(unit.col / (sheet.cols - 1)) * 100}% ${(unit.row / (sheet.rows - 1)) * 100}%`,
      imageRendering: 'pixelated' as const
    };
  }
};
