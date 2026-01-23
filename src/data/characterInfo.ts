/**
 * 侠士 UI 介绍信息配置
 * 职责：存储主菜单、角色选择界面等展示层所需的数据
 */

export interface CharacterTrait {
  label: string;
  value: string;
  isPositive: boolean;
}

export interface CharacterUIInfo {
  id: string;
  name: string;
  sect: string;       // 门派名称
  title: string;      // 称号/副标题
  description: string; // 角色背景描述
  difficulty: number;  // 上手难度 (1-5)
  traits: CharacterTrait[]; // 门派特质
  displayStats: {      // 描述性展示属性
    health: string;
    speed: string;
  };
}

export const CHARACTER_UI_INFOS: Record<string, CharacterUIInfo> = {
  'player_wanhua': {
    id: 'player_wanhua',
    name: '万花师兄',
    sect: '万花谷',
    title: '妙手医心',
    description: '妙手空空，笔墨定乾坤。万花武学以点穴截脉闻名，身法飘逸，攻守兼备。',
    difficulty: 3,
    traits: [
      { label: '生命值成长', value: '+35%', isPositive: true },
      { label: '基础攻击力', value: '+50%', isPositive: true },
      { label: '初始移动速度', value: '-3%', isPositive: false },
    ],
    displayStats: {
      health: '1200',
      speed: '均衡'
    }
  },
  'player_tiance': {
    id: 'player_tiance',
    name: '天策师兄',
    sect: '天策府',
    title: '东都之狼',
    description: '长枪所向，东都之狼。天策府乃大唐铁骑，武学刚猛无俦，冲锋陷阵，所向披靡。',
    difficulty: 4,
    traits: [
      { label: '冲锋伤害', value: '+40%', isPositive: true },
      { label: '外功防御', value: '+25%', isPositive: true },
      { label: '攻击间隔', value: '+10%', isPositive: false },
    ],
    displayStats: {
      health: '1500',
      speed: '极快'
    }
  }
};
