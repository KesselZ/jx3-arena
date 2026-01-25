import * as THREE from 'three';
import { UNITS, SPRITE_SHEETS } from '../data/units';

// --- 核心逻辑 (The Engine) ---
const baseTextureCache: Record<string, Promise<THREE.Texture>> = {};
const finalTextureCache: Record<string, { texture: THREE.Texture, width: number, height: number, anchorY: number }> = {};

/**
 * SpriteFactory: 集中化资源管理器
 * 职责：负责纹理切分、像素探测、缓存管理
 */
export const Assets = {
  /**
   * 预加载所有兵种资源
   */
  preloadAll: async () => {
    // console.log('[Assets] 正在预加载所有兵种纹理...');
    const promises = Object.keys(UNITS).map(id => Assets.getTexture(id));
    return Promise.all(promises);
  },

  /**
   * 同步获取，用于渲染循环
   */
  getTextureSync: (unitId: string) => {
    return finalTextureCache[unitId] || null;
  },

  /**
   * 采用“图集克隆 + 像素预探测”模式：
   */
  getTexture: async (unitId: string): Promise<{ texture: THREE.Texture, width: number, height: number, anchorY: number }> => {
    try {
      if (finalTextureCache[unitId]) return finalTextureCache[unitId];

      const unit = UNITS[unitId];
      if (!unit) throw new Error(`Unit definition not found: ${unitId}`);
      
      const sheet = SPRITE_SHEETS[unit.sheet as keyof typeof SPRITE_SHEETS];
      if (!sheet) throw new Error(`Sheet definition not found for unit: ${unitId}, sheet: ${unit.sheet}`);

      // 1. 加载基础大图 (带 Promise 缓存，防止重复加载)
      if (!baseTextureCache[unit.sheet]) {
        const loader = new THREE.TextureLoader();
        // console.log(`[Assets] 正在从网络加载大图: ${sheet.path}`);
        baseTextureCache[unit.sheet] = loader.loadAsync(sheet.path).then(tex => {
          tex.minFilter = tex.magFilter = THREE.NearestFilter;
          // console.log(`[Assets] 大图加载成功: ${sheet.path}`, tex.image.width, 'x', tex.image.height);
          return tex;
        });
      }

      const baseTex = await baseTextureCache[unit.sheet];
      const img = baseTex.image;
      
      if (!img || !img.width) {
        throw new Error(`Image not ready for sheet: ${unit.sheet}`);
      }

      const cw = img.width / sheet.cols;
      const ch = img.height / sheet.rows;

      // 2. 核心：预扫描像素探测脚底 (anchorY)
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cw; tempCanvas.height = ch;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
      tempCtx.drawImage(img, unit.col * cw, unit.row * ch, cw, ch, 0, 0, cw, ch);
      
      const pixelData = tempCtx.getImageData(0, 0, cw, ch).data;
      let lastVisibleY = ch; 
      for (let i = pixelData.length - 1; i >= 3; i -= 4) {
        if (pixelData[i] > 30) { 
          const py = Math.floor((i / 4) / cw);
          lastVisibleY = py;
          break; 
        }
      }
      const anchorY = lastVisibleY / ch;

      // 3. 克隆纹理（共享显存）
      const tex = baseTex.clone();
      tex.repeat.set(1 / sheet.cols, 1 / sheet.rows);
      tex.offset.set(unit.col / sheet.cols, (sheet.rows - 1 - unit.row) / sheet.rows);
      tex.needsUpdate = true;

      const result = { texture: tex, width: cw, height: ch, anchorY };
      finalTextureCache[unitId] = result;
      return result;
    } catch (err) {
      console.error(`[Assets] 获取纹理失败 [${unitId}]:`, err);
      throw err;
    }
  },

  /**
   * UI 专用：获取 CSS 背景样式 (直接使用原始路径，效率最高)
   */
  getCSS: (unitId: string) => {
    const unit = UNITS[unitId];
    if (!unit) return {};
    const sheet = SPRITE_SHEETS[unit.sheet];
    return {
      backgroundImage: `url(${sheet.path})`,
      backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
      backgroundPosition: `${(unit.col / (sheet.cols - 1)) * 100}% ${(unit.row / (sheet.rows - 1)) * 100}%`,
      imageRendering: 'pixelated' as const
    };
  }
};
