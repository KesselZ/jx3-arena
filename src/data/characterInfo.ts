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
    },
    'player_chunyang_senior': {
      id: 'player_chunyang_senior',
      name: '纯阳师兄',
      sect: '纯阳宫',
      title: '剑气纵横',
      description: '昆仑玄境山外山，乾坤阴阳有洞天。纯阳师兄精通御剑之术，以气御剑，杀敌于百步之外。',
      difficulty: 4,
      traits: [
        { label: '御剑伤害', value: '+45%', isPositive: true },
        { label: '攻击频率', value: '极高', isPositive: true },
        { label: '基础生命', value: '-10%', isPositive: false },
      ],
      displayStats: {
      health: '1100',
      speed: '灵动'
    }
  },
  'player_tangmen_senior': {
    id: 'player_tangmen_senior',
    name: '唐门师兄',
    sect: '唐门',
    title: '追魂夺命',
    description: '蜀中唐门，暗器之王。以机关暗器闻名天下，身法诡谲，令人防不胜防。',
    difficulty: 5,
    traits: [
      { label: '暗器伤害', value: '+50%', isPositive: true },
      { label: '暴击几率', value: '+20%', isPositive: true },
      { label: '基础生命', value: '-15%', isPositive: false },
    ],
    displayStats: {
      health: '950',
      speed: '极快'
    }
  },
  'player_badao_senior': {
    id: 'player_badao_senior',
    name: '霸刀师兄',
    sect: '霸刀山庄',
    title: '傲霜凌雪',
    description: '北地霸刀，刀气纵横。以长刀、短刀、鞘刀三态切换闻名，刀法刚猛，气势磅礴。',
    difficulty: 4,
    traits: [
      { label: '刀气伤害', value: '+40%', isPositive: true },
      { label: '破防能力', value: '+30%', isPositive: true },
      { label: '攻击速度', value: '-10%', isPositive: false },
    ],
    displayStats: {
      health: '1400',
      speed: '沉稳'
    }
  }
};
