import React, { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useAttributeStore, Modifier } from '../store/useAttributeStore'
import { motion, AnimatePresence } from 'framer-motion'
import { AudioAssets } from '../assets/audioAssets'

interface ShopItem {
  id: number;
  name: string;
  desc: string;
  cost: number;
  icon: string;
  effect: Omit<Modifier, 'id'>;
}

export const ShopView: React.FC = () => {
  const showShop = useGameStore((state) => state.showShop)
  const closeShop = useGameStore((state) => state.closeShop)
  const gold = useGameStore((state) => state.gold)
  const addGold = useGameStore((state) => state.addGold)
  const wave = useGameStore((state) => state.wave)

  const addModifier = useAttributeStore((state) => state.addModifier)

  // 监听商店显示状态，动态调整 BGM 音量
  useEffect(() => {
    if (showShop) {
      AudioAssets.setBGMVolumeScale(0.4, 1000); // 进入商店，BGM 降至 40% (更清晰一些)
    } else {
      AudioAssets.setBGMVolumeScale(1.0, 800);  // 离开商店，BGM 恢复
    }
  }, [showShop]);

  // 模拟商品数据
  const [items] = useState<ShopItem[]>([
    { 
      id: 1, name: '洗髓经', desc: '生命上限 +20%', cost: 100, icon: '📜',
      effect: { attribute: 'maxHp', value: 0.2, type: 'MULT' }
    },
    { 
      id: 2, name: '纯阳剑意', desc: '攻击力 +15%', cost: 150, icon: '⚔️',
      effect: { attribute: 'power', value: 0.15, type: 'MULT' }
    },
    { 
      id: 3, name: '凌波微步', desc: '移动速度 +10%', cost: 80, icon: '💨',
      effect: { attribute: 'moveSpeed', value: 0.1, type: 'MULT' }
    },
  ])

  const handleBuy = (item: ShopItem) => {
    if (gold >= item.cost) {
      AudioAssets.play2D('CLICK_CONFIRM');
      addGold(-item.cost);
      addModifier({
        ...item.effect,
        id: `shop_item_${item.id}_${Date.now()}`
      });
      // 这里可以添加一个购买成功的反馈，比如从列表中移除或标记已购
    } else {
      AudioAssets.play2D('CLICK_PRESS'); // 钱不够的音效
    }
  }

  return (
    <AnimatePresence>
      {showShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
          {/* 背景遮罩：模糊效果 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-jx3-ink/80 backdrop-blur-md"
          />

          {/* 商店主面板：从上方掉落动画 */}
          <motion.div 
            initial={{ y: -1000, rotateX: -20 }}
            animate={{ y: 0, rotateX: 0 }}
            exit={{ y: -1000, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="relative w-[90%] max-w-5xl h-[85%] bg-jx3-paper border-4 border-jx3-gold shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden rounded-sm"
            style={{
              backgroundImage: 'radial-gradient(circle at center, transparent 0%, rgba(212, 175, 55, 0.05) 100%)'
            }}
          >
            {/* 装饰性边角 */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-jx3-gold" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-jx3-gold" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-jx3-gold" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-jx3-gold" />

            {/* 顶部标题栏 */}
            <div className="bg-jx3-ink p-6 flex justify-between items-center border-b-2 border-jx3-gold">
              <div className="flex items-baseline gap-4">
                <h2 className="text-4xl font-bold text-jx3-gold tracking-[0.2em] drop-shadow-lg">行脚商铺</h2>
                <span className="text-jx3-gold/60 text-sm font-mono uppercase tracking-widest">WAVE {wave-1} COMPLETED</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-[10px] text-jx3-gold/50 uppercase tracking-tighter">当前碎银</div>
                  <div className="text-3xl font-bold text-yellow-400 font-mono">{gold}</div>
                </div>
              </div>
            </div>

            {/* 中间商品区 */}
            <div className="flex-1 p-10 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {items.map((item, index) => {
                  const canAfford = gold >= item.cost;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      onClick={() => canAfford && handleBuy(item)}
                      className={`group relative bg-white/50 border-2 p-6 transition-all cursor-pointer flex flex-col items-center text-center
                        ${canAfford ? 'border-jx3-ink/10 hover:border-jx3-gold hover:bg-white' : 'opacity-60 grayscale cursor-not-allowed border-red-200'}
                      `}
                    >
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                      <h3 className="text-xl font-bold text-jx3-ink mb-2">{item.name}</h3>
                      <p className="text-sm text-jx3-ink/60 mb-6">{item.desc}</p>
                      <div className="mt-auto w-full">
                        <div className={`font-bold mb-2 ${canAfford ? 'text-jx3-gold' : 'text-red-500'}`}>
                          {item.cost} 碎银
                        </div>
                        <button 
                          className={`w-full py-2 font-bold text-sm border transition-all
                            ${canAfford 
                              ? 'bg-jx3-ink text-jx3-gold border-jx3-gold group-hover:bg-jx3-gold group-hover:text-jx3-ink' 
                              : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'}
                          `}
                          disabled={!canAfford}
                        >
                          {canAfford ? '立即参悟' : '碎银不足'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                
                {/* 占位符 */}
                {[1, 2, 3].map((i) => (
                  <div key={`empty-${i}`} className="border-2 border-dashed border-jx3-ink/5 rounded-lg flex items-center justify-center p-10">
                    <span className="text-jx3-ink/10 italic text-sm">虚位以待</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="p-8 bg-jx3-ink/5 border-t border-jx3-ink/10 flex justify-center items-center gap-10">
              <button 
                onClick={closeShop}
                className="group relative px-16 py-4 bg-jx3-ink text-jx3-gold font-bold text-2xl tracking-[0.3em] overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                {/* 按钮装饰 */}
                <div className="absolute inset-0 border-2 border-jx3-gold/30 group-hover:border-jx3-gold transition-colors" />
                <span className="relative z-10">继续战斗</span>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-jx3-gold transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </button>
              
              <div className="text-jx3-ink/40 text-xs max-w-[200px] leading-relaxed">
                提示：选择合适的天赋能让你在接下来的战斗中生存更久。
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
