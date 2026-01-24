import { DialogueLine } from '../store/useGameStore';

export const DIALOGUES: Record<string, DialogueLine[]> = {
  // 初始进入竞技场的通用对话
  ARENA_START: [
    { 
      speaker: '谷之岚', 
      content: '你好，我是{谷之岚|text-jx3-gold}。欢迎来到{大唐竞技场|text-jx3-gold}！这里不仅是武艺的较量，更是意志的磨砺。',
      speakerPic: '/assets/holder.png'
    },
    { 
      speaker: '谷之岚', 
      content: '在这片土地上，你需要通过{击败敌人|text-red-400}来获取{金钱|text-yellow-400}，并在战斗间隙提升自己的实力。',
      speakerPic: '/assets/holder.png'
    },
    { 
      speaker: '谷之岚', 
      content: '准备好了吗？让我们开启这段{强者之路|text-jx3-gold}吧！',
      speakerPic: '/assets/holder.png'
    }
  ],
  
  // 角色专属开场白 (key 为角色 ID)
  cangjian: [
    { speaker: '叶英', content: '心剑合一，方能破敌。今日便让你们见识藏剑山庄的剑法。' },
    { speaker: '神秘人', content: '藏剑传人？有意思，希望你的剑和你的名声一样响。' },
    { speaker: '叶英', content: '废话少说，出招吧！' }
  ],
  
  chunyang: [
    { speaker: '李忘生', content: '太极生两仪，四象拨千斤。纯阳弟子，随我涤荡妖邪！' },
    { speaker: '神秘人', content: '道门的阵法确实麻烦，但在这里，只有生死。' },
    { speaker: '李忘生', content: '顺应天道，斩妖除魔！' }
  ],

  tiance: [
    { speaker: '李承恩', content: '长枪所向，尽是唐土！天策府将士，随我冲锋！' },
    { speaker: '神秘人', content: '东都之狼名不虚传，这股杀气...令人兴奋。' },
    { speaker: '李承恩', content: '为了大唐，杀！' }
  ],

  wanhua: [
    { speaker: '东方宇轩', content: '医者仁心，亦可杀人。万花谷不参与江湖纷争，但绝不畏惧挑战。' },
    { speaker: '神秘人', content: '万花的点穴手和墨笔...我倒要看看你能撑多久。' },
    { speaker: '东方宇轩', content: '笔墨丹青，亦能定乾坤。' }
  ]
};
