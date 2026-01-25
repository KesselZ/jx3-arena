import * as THREE from 'three';
import { Howl } from 'howler';

/**
 * 声音资源定义
 * 支持单路径或多路径随机池 (Random Container)
 */
export const SOUND_ASSETS = {
  // --- 战斗 (3D) ---
  SLASH: { path: '/audio/attack/挥砍1.mp3', is3D: true, volume: 0.6, limit: 4 },
  IMPACT: { path: '/audio/attack/挥拳击中1.mp3', is3D: true, volume: 0.5, limit: 4 },
  ARROW: { 
    paths: ['/audio/attack/射箭.mp3', '/audio/attack/射箭2.mp3'], 
    is3D: true, volume: 0.4, limit: 5 
  },
  AIR_SWORD: { 
    paths: ['/audio/attack/气剑1.mp3', '/audio/attack/气剑2.mp3'], 
    is3D: true, volume: 0.5, limit: 5 
  },
  BURST: { path: '/audio/attack/挥拳击中1.mp3', is3D: true, volume: 0.6, limit: 4 },
  
  // 被击中音效池 (Random Container)
  HIT_BODY: { 
    paths: [
      '/audio/onhit/被击中1.mp3',
      '/audio/onhit/被砍中1.mp3',
      '/audio/onhit/被砍中2.mp3'
    ], 
    is3D: true, 
    volume: 0.4, 
    limit: 6 
  },
  
  // --- UI (2D) ---
  CLICK_LIGHT: { path: '/audio/click/轻微click声.mp3', is3D: false, volume: 0.5 },
  CLICK_CLEAN: { path: '/audio/click/清脆按钮.mp3', is3D: false, volume: 0.6 },
  CLICK_PRESS: { path: '/audio/click/按下音效.mp3', is3D: false, volume: 0.5 },
  CLICK_SELECT: { path: '/audio/click/卡牌声音.mp3', is3D: false, volume: 0.5 },
  CLICK_HOVER: { path: '/audio/click/轻微click声.mp3', is3D: false, volume: 0.3 },
  CLICK_CONFIRM: { path: '/audio/click/出现建筑选择.mp3', is3D: false, volume: 0.7 },
  TYPEWRITER: { path: '/audio/sources/文字气泡.mp3', is3D: false, volume: 0.4 },
  SUCCESS: { path: '/audio/click/胜利音效.mp3', is3D: false, volume: 0.7 },
  FAIL: { path: '/audio/click/战斗失败音效.mp3', is3D: false, volume: 0.7 },
  COIN_PICKUP: { path: '/audio/sources/拿到一个金币.mp3', is3D: false, volume: 0.6 },
  
  // --- 场景 (3D/2D) ---
  WALK_GRASS: { 
    paths: [
      '/audio/walk/草地奔跑脚步1.mp3',
      '/audio/walk/草地奔跑脚步2.mp3',
      '/audio/walk/草地奔跑脚步3.mp3'
    ], 
    is3D: true, 
    volume: 0.3, 
    limit: 2 
  },
  BGM_MENU: { path: '/audio/bgm/天赋界面.mp3', is3D: false, volume: 0.25, loop: true },
  BGM_BATTLE: { path: '/audio/bgm/奇怪电音.mp3', is3D: false, volume: 0.3, loop: true },
} as const;

export type SoundID = keyof typeof SOUND_ASSETS;

/**
 * 声音优先级定义
 */
export enum SoundPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * 优先级对应的基础音量权重 (高级动态混音)
 */
const PRIORITY_VOLUME_WEIGHT: Record<SoundPriority, number> = {
  [SoundPriority.LOW]: 0.2,      // 敌人攻击：仅作为氛围，极低音量
  [SoundPriority.NORMAL]: 0.5,   // 杂兵受击/普通UI：清晰但不过载
  [SoundPriority.HIGH]: 0.8,     // 玩家攻击：强力反馈
  [SoundPriority.CRITICAL]: 1.0, // 玩家受击/核心UI：绝对警示
};

class AudioManager {
  private listener: THREE.AudioListener | null = null;
  private audioLoader = new THREE.AudioLoader();
  private bufferCache = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer>>();
  
  // BGM (Howler)
  private bgmInstance: Howl | null = null;
  private currentBgmId: SoundID | null = null;
  private bgmVolumeScale = 1.0;

  // 调度器状态
  private soundCounts = new Map<SoundID, number>();
  private readonly GLOBAL_MAX_VOICES = 32;
  private activeVoices = 0;

  /**
   * 初始化监听器，必须挂载到相机上
   */
  init(camera: THREE.Camera) {
    // 核心修复：如果监听器已存在，确保它被移动到当前的活跃相机上
    if (!this.listener) {
      this.listener = new THREE.AudioListener();
      console.log(`[AudioDebug] Listener Created`);
    }
    
    if (this.listener.parent) {
      this.listener.parent.remove(this.listener);
    }
    camera.add(this.listener);
    console.log(`[AudioDebug] Listener attached to camera:`, camera.type);
    
    // 处理浏览器自动播放限制
    const resumeAudio = () => {
      if (THREE.AudioContext.getContext().state === 'suspended') {
        THREE.AudioContext.getContext().resume();
      }
      // Howler 也会自动尝试恢复
      if (this.bgmInstance && this.bgmInstance.state() === 'loaded') {
        this.bgmInstance.play();
      }
      window.removeEventListener('click', resumeAudio);
    };
    window.addEventListener('click', resumeAudio);
    
    return this.listener;
  }

  /**
   * 播放 BGM (使用 Howler)
   * 支持平滑淡入淡出切换
   * @param id 音频资源 ID
   * @param fadeDuration 淡入淡出时长 (ms)
   */
  playBGM(id: SoundID, fadeDuration = 1500) {
    // [优化] 状态守卫：如果正在播放相同的 BGM，且没有被停止，则忽略请求
    if (this.currentBgmId === id && this.bgmInstance) {
      if (this.bgmInstance.playing() || this.bgmInstance.state() === 'loading') {
        return;
      }
    }

    const config = SOUND_ASSETS[id];
    // [兼容性] 支持单路径或多路径配置，BGM 通常取第一个
    const path = 'path' in config ? config.path : (config as any).paths[0];
    const targetVolume = (config.volume || 0.5) * this.bgmVolumeScale;

    // [核心逻辑] 1. 处理旧 BGM 实例：淡出 -> 停止 -> 卸载内存
    if (this.bgmInstance) {
      const oldInstance = this.bgmInstance;
      oldInstance.fade(oldInstance.volume(), 0, fadeDuration);
      setTimeout(() => {
        oldInstance.stop();
        oldInstance.unload(); 
      }, fadeDuration);
    }

    // [核心逻辑] 2. 记录当前 ID，防止异步过程中重复触发
    this.currentBgmId = id;

    // [核心逻辑] 3. 创建新 BGM (启用 html5 模式以支持大文件流式播放)
    this.bgmInstance = new Howl({
      src: [path],
      loop: true,
      html5: true, // 关键：大文件不预加载到 WebAudio 节点，直接流式播放
      volume: 0,   // 从 0 开始淡入
    });

    this.bgmInstance.play();
    this.bgmInstance.fade(0, targetVolume, fadeDuration);

    console.log(`[AudioManager] 🎵 切换 BGM: ${id} (${path})`);
  }

  /**
   * 动态调整 BGM 音量缩放 (例如进入商店时)
   * @param multiplier 0 到 1 的倍数
   * @param fadeDuration 淡入淡出时长
   */
  setBGMVolumeScale(multiplier: number, fadeDuration = 1000) {
    this.bgmVolumeScale = multiplier;
    if (!this.bgmInstance || !this.currentBgmId) return;
    
    const config = SOUND_ASSETS[this.currentBgmId];
    const targetVolume = (config.volume || 0.5) * multiplier;
    
    // 使用 Howler 的平滑过渡
    this.bgmInstance.fade(this.bgmInstance.volume(), targetVolume, fadeDuration);
    console.log(`[AudioManager] BGM 音量缩放: ${multiplier * 100}%`);
  }

  /**
   * 停止 BGM
   */
  stopBGM(fadeDuration = 1000) {
    if (!this.bgmInstance) return;
    const instance = this.bgmInstance;
    instance.fade(instance.volume(), 0, fadeDuration);
    setTimeout(() => {
      instance.stop();
      this.bgmInstance = null;
      this.currentBgmId = null;
    }, fadeDuration);
  }

  /**
   * 预加载核心音效
   */
  async preload(ids: SoundID[]) {
    const paths: string[] = [];
    ids.forEach(id => {
      const config = SOUND_ASSETS[id];
      if ('paths' in config) {
        paths.push(...(config as any).paths);
      } else {
        paths.push((config as any).path);
      }
    });
    await Promise.all(paths.map(path => this.loadBuffer(path)));
  }

  private async loadBuffer(path: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(path)) return this.bufferCache.get(path)!;
    if (this.loadingPromises.has(path)) return this.loadingPromises.get(path)!;

    const promise = (async () => {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = THREE.AudioContext.getContext();
        
        const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
          audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });

        this.bufferCache.set(path, buffer);
        return buffer;
      } catch (err) {
        console.error(`[AudioAssets] 无法加载音效: ${path}`, err);
        throw err;
      } finally {
        this.loadingPromises.delete(path);
      }
    })();

    this.loadingPromises.set(path, promise);
    return promise;
  }

  /**
   * 智能播放请求 (带优先级音量权重、并发控制和距离裁剪)
   */
  async play(id: SoundID, options?: { 
    position?: { x: number, y?: number, z: number }, 
    priority?: SoundPriority,
    volumeMult?: number,
    sourceType?: 'player' | 'enemy' | 'ally' | 'ui'
  }) {
    if (!this.listener) return;
    const config = SOUND_ASSETS[id];
    const priority = options?.priority ?? SoundPriority.NORMAL;
    const volumeMult = options?.volumeMult ?? 1;

    // 1. 计算优先级权重音量 (高级动态混音)
    const priorityWeight = PRIORITY_VOLUME_WEIGHT[priority];
    const finalVolumeBase = (config.volume || 1) * volumeMult * priorityWeight;

    // 2. 距离裁剪 (仅针对 3D 音效)
    if (config.is3D && options?.position) {
      const camPos = this.listener.getWorldPosition(new THREE.Vector3());
      const distSq = (options.position.x - camPos.x) ** 2 + (options.position.z - camPos.z) ** 2;
      
      // 添加调试日志：每 20 次播放打印一次，避免刷屏
      if (Math.random() < 0.05) {
        console.log(`[AudioDebug] ID: ${id}, CamPos: ${camPos.x.toFixed(1)},${camPos.z.toFixed(1)}, SoundPos: ${options.position.x.toFixed(1)},${options.position.z.toFixed(1)}, Dist: ${Math.sqrt(distSq).toFixed(1)}`);
      }

      if (distSq > 50 * 50) return; // 50米外直接丢弃
    }

    // 3. 并发限制判定
    const currentCount = this.soundCounts.get(id) || 0;
    const limit = (config as any).limit || 99;

    if (currentCount >= limit || this.activeVoices >= this.GLOBAL_MAX_VOICES) {
      // 如果优先级不够高，则不播放
      if (priority < SoundPriority.HIGH) return;
    }

    // 4. 执行播放逻辑
    if (config.is3D && options?.position) {
      this.executePlay3D(id, options.position, finalVolumeBase);
    } else {
      this.executePlay2D(id, finalVolumeBase);
    }
  }

  private async executePlay3D(id: SoundID, position: { x: number, y?: number, z: number }, volumeMult: number) {
    const config = SOUND_ASSETS[id];
    const path = 'paths' in config 
      ? config.paths[Math.floor(Math.random() * config.paths.length)]
      : config.path;

    const buffer = await this.loadBuffer(path);
    const sound = new THREE.PositionalAudio(this.listener!);
    
    // --- 1. 真正的 3D 物理属性设置 ---
    sound.setBuffer(buffer);
    sound.setRefDistance(1);  // 1米内满音量
    sound.setMaxDistance(5);  // 5米外完全消失！极端的近大远小
    sound.setDistanceModel('exponential'); 
    
    // --- 2. 音效随机化 (高级音响工程师秘籍) ---
    // 随机音调：让声音不再像“复读机”
    const pitchShift = 0.9 + Math.random() * 0.2; // 0.9 ~ 1.1
    sound.setPlaybackRate(pitchShift);
    
    // 随机音量：微小的力度变化
    const volRandom = 0.9 + Math.random() * 0.2; // 0.9 ~ 1.1
    sound.setVolume((config.volume || 1) * volumeMult * volRandom * 2.0); // 进一步提升近处音量至 2 倍，增强冲击力

    const mesh = new THREE.Object3D();
    mesh.position.set(position.x, position.y || 0, position.z);
    mesh.add(sound);

    this.onSoundStart(id);
    sound.onEnded = () => {
      this.onSoundEnd(id);
      mesh.removeFromParent();
      sound.disconnect();
    };

    // --- 3. 修复：强制获取真正的根场景 (Scene) ---
    let root: THREE.Object3D = this.listener!;
    while (root.parent) {
      root = root.parent;
    }
    
    // 如果追溯到的根节点不是 Scene，尝试从 listener 的 parent 链之外寻找
    // 在 R3F 中，有时候需要通过这种方式确保加到世界
    root.add(mesh);
    
    // 调试日志：检查场景和位置
    if (Math.random() < 0.05) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      console.log(`[AudioDebug] 3D Sound Object - Name: ${id}, RootType: ${root.type}, MeshWorldPos: ${worldPos.x.toFixed(1)},${worldPos.z.toFixed(1)}`);
    }

    sound.play();
  }

  private async executePlay2D(id: SoundID, volumeMult: number) {
    const config = SOUND_ASSETS[id];
    const path = 'paths' in config 
      ? config.paths[Math.floor(Math.random() * config.paths.length)]
      : config.path;

    const buffer = await this.loadBuffer(path);
    const sound = new THREE.Audio(this.listener!);
    
    sound.setBuffer(buffer);
    
    // UI 音效也加入轻微随机化，增加质感
    const pitchShift = 0.95 + Math.random() * 0.1; 
    sound.setPlaybackRate(pitchShift);
    
    sound.setVolume((config.volume || 1) * volumeMult);
    sound.setLoop(!!(config as any).loop);
    
    this.onSoundStart(id);
    if (!(config as any).loop) {
      sound.onEnded = () => {
        this.onSoundEnd(id);
        sound.disconnect();
      };
    }
    
    sound.play();
    return sound;
  }

  private onSoundStart(id: SoundID) {
    this.soundCounts.set(id, (this.soundCounts.get(id) || 0) + 1);
    this.activeVoices++;
  }

  private onSoundEnd(id: SoundID) {
    this.soundCounts.set(id, Math.max(0, (this.soundCounts.get(id) || 1) - 1));
    this.activeVoices--;
  }

  /**
   * 兼容旧接口 (内部转调 play)
   */
  async play3D(id: SoundID, position: { x: number, y?: number, z: number }, volumeMult = 1) {
    return this.play(id, { position, volumeMult });
  }

  async play2D(id: SoundID, volumeMult = 1) {
    return this.play(id, { volumeMult });
  }
}

export const AudioAssets = new AudioManager();
