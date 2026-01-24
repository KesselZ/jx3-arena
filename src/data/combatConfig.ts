import { SoundID } from '../assets/audioAssets';

/**
 * 战斗风格定义 (Combat Style)
 * 职责：将逻辑、音效、特效解耦，实现高度声明式的战斗系统
 */
export interface CombatStyle {
  id: string;
  logic: 'melee' | 'ranged';
  sfx: {
    fire: SoundID;    // 发起动作时的音效
    hit: SoundID;     // 命中时的音效
  };
  vfx: {
    type: 'slash' | 'arrow' | 'burst' | 'air_sword' | 'gold_coin';
    duration: number;
  };
}

export const COMBAT_STYLES: Record<string, CombatStyle> = {
  'slash': {
    id: 'slash',
    logic: 'melee',
    sfx: { fire: 'SLASH', hit: 'HIT_BODY' },
    vfx: { type: 'slash', duration: 0.3 }
  },
  'burst': {
    id: 'burst',
    logic: 'melee',
    sfx: { fire: 'IMPACT', hit: 'HIT_BODY' },
    vfx: { type: 'burst', duration: 0.4 }
  },
  'arrow': {
    id: 'arrow',
    logic: 'ranged',
    sfx: { fire: 'ARROW', hit: 'HIT_BODY' },
    vfx: { type: 'arrow', duration: 2.0 } // 弹道寿命
  },
  'air_sword': {
    id: 'air_sword',
    logic: 'ranged',
    sfx: { fire: 'AIR_SWORD', hit: 'HIT_BODY' },
    vfx: { type: 'air_sword', duration: 2.0 }
  },
  'gold_coin': {
    id: 'gold_coin',
    logic: 'ranged',
    sfx: { fire: 'CLICK_CLEAN', hit: 'CLICK_CLEAN' },
    vfx: { type: 'gold_coin' as any, duration: 10.0 }
  }
};
