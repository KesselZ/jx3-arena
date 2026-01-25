import { create } from 'zustand';

/**
 * 修改器类型
 * ADD: 加法 (Base + Value)
 * MULT: 乘法 (Base * (1 + Value)) - 土豆兄弟风格的加法堆叠乘法
 * FINAL: 最终修正 (直接覆盖或最后计算)
 */
export type ModifierType = 'ADD' | 'MULT' | 'FINAL';

export interface Modifier {
  id: string;
  attribute: string;
  value: number;
  type: ModifierType;
}

interface AttributeState {
  // 玩家当前的属性修改器列表
  modifiers: Modifier[];
  
  // 基础属性（从 units.ts 加载后的初始值副本）
  baseStats: Record<string, number>;

  // 动作
  addModifier: (mod: Modifier) => void;
  removeModifier: (id: string) => void;
  setBaseStats: (stats: Record<string, number>) => void;
  
  // 计算最终属性的工具函数
  getFinalStat: (attrName: string) => number;
}

export const useAttributeStore = create<AttributeState>((set, get) => ({
  modifiers: [],
  baseStats: {},

  addModifier: (mod) => set((state) => ({ 
    modifiers: [...state.modifiers, mod] 
  })),

  removeModifier: (id) => set((state) => ({ 
    modifiers: state.modifiers.filter(m => m.id !== id) 
  })),

  setBaseStats: (stats) => set({ baseStats: stats }),

  /**
   * 获取属性详细组成 (用于 UI 显示)
   */
  getStatDetail: (attrName: string) => {
    const { baseStats, modifiers } = get();
    const base = baseStats[attrName] || 0;
    const relevantMods = modifiers.filter(m => m.attribute === attrName);

    const addValue = relevantMods
      .filter(m => m.type === 'ADD')
      .reduce((sum, m) => sum + m.value, 0);

    const multValue = relevantMods
      .filter(m => m.type === 'MULT')
      .reduce((sum, m) => sum + m.value, 0);

    const finalValue = (base + addValue) * (1 + multValue);

    return {
      base,
      addValue,
      multValue,
      finalValue
    };
  },

  getFinalStat: (attrName) => {
    const { baseStats, modifiers } = get();
    const base = baseStats[attrName] || 0;
    
    const relevantMods = modifiers.filter(m => m.attribute === attrName);
    
    // 1. 处理加法 (ADD)
    const addValue = relevantMods
      .filter(m => m.type === 'ADD')
      .reduce((sum, m) => sum + m.value, 0);
    
    let current = base + addValue;
    
    // 2. 处理乘法 (MULT) - 采用 (1 + ΣMult) 逻辑，防止数值爆炸
    const multValue = relevantMods
      .filter(m => m.type === 'MULT')
      .reduce((sum, m) => sum + m.value, 0);
    
    current *= (1 + multValue);
    
    // 3. 处理最终修正 (FINAL) - 简单覆盖逻辑，可根据需要扩展
    const finalMod = relevantMods.find(m => m.type === 'FINAL');
    if (finalMod) {
      current = finalMod.value;
    }
    
    return current;
  }
}));
