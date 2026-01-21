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
    facing: 'right', anchor: 'bottom',
    isPlayable: true, description: '妙手空空，笔墨定乾坤。'
  },
  'player_tiance': { 
    sheet: 'tiance4', row: 1, col: 0, name: '天策师兄', 
    facing: 'right', anchor: 'bottom',
    isPlayable: true, description: '长枪所向，东都之狼。'
  },
  
  // 友军
  'ally_chunyang': { 
    sheet: 'chunyang', row: 0, col: 0, name: '纯阳弟子', 
    facing: 'right', anchor: 'bottom',
    isPlayable: false
  },

  // 敌人
  'bandit': { 
    sheet: 'enemy', row: 1, col: 0, name: '山贼', 
    facing: 'left', anchor: 'bottom',
    isPlayable: false
  },
  'archer': { 
    sheet: 'enemy', row: 1, col: 1, name: '山贼射手', 
    facing: 'right', anchor: 'bottom',
    isPlayable: false
  },
} as const;

// --- 2. 核心逻辑 (The Engine) ---
const textureCache: Record<string, THREE.Texture> = {};

export const Assets = {
  /**
   * 自动处理精灵图：裁剪留白、对齐锚点、生成 Three.js 纹理
   */
  getTexture: async (unitId: keyof typeof UNITS): Promise<THREE.Texture> => {
    if (textureCache[unitId]) return textureCache[unitId];

    const unit = UNITS[unitId];
    const sheet = SPRITE_SHEETS[unit.sheet];

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = sheet.path;
      img.onload = () => {
        const cw = img.width / sheet.cols, ch = img.height / sheet.rows;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        
        // 1. 提取原始切片
        canvas.width = cw; canvas.height = ch;
        ctx.drawImage(img, unit.col * cw, unit.row * ch, cw, ch, 0, 0, cw, ch);

        if ((unit.anchor as string) === 'none') {
          const tex = new THREE.CanvasTexture(canvas);
          tex.minFilter = tex.magFilter = THREE.NearestFilter;
          resolve(textureCache[unitId] = tex);
          return;
        }

        // 2. 探测像素边界 (检测非透明像素)
        const data = ctx.getImageData(0, 0, cw, ch).data;
        let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) {
            const px = (i / 4) % cw, py = Math.floor((i / 4) / cw);
            x0 = Math.min(x0, px); x1 = Math.max(x1, px);
            y0 = Math.min(y0, py); y1 = Math.max(y1, py);
          }
        }

        // 3. 生成紧凑的成品纹理
        const w = x1 - x0 + 1, h = y1 - y0 + 1;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = w; finalCanvas.height = h;
        finalCanvas.getContext('2d')!.drawImage(canvas, x0, y0, w, h, 0, 0, w, h);

        const tex = new THREE.CanvasTexture(finalCanvas);
        tex.minFilter = tex.magFilter = THREE.NearestFilter;
        resolve(textureCache[unitId] = tex);
      };
    });
  },

  /**
   * UI 专用：获取 CSS 背景样式
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
