import React from 'react'
import { useGameStore } from '../store/useGameStore'
import { useAttributeStore } from '../store/useAttributeStore'
import { motion } from 'framer-motion'

/**
 * 属性条目组件 - 升级版：支持显示计算过程
 */
const StatItem = ({ 
  label, 
  attrName, 
  unit = '', 
  color = 'text-jx3-ink' 
}: { 
  label: string, 
  attrName: string, 
  unit?: string, 
  color?: string 
}) => {
  const { getStatDetail } = useAttributeStore();
  const { base, addValue, multValue, finalValue } = getStatDetail(attrName);

  // 如果没有加成，只显示最终值
  const hasBonus = addValue !== 0 || multValue !== 0;

  return (
    <div className="group flex flex-col py-2 border-b border-jx3-ink/5 hover:bg-jx3-gold/5 transition-colors px-1">
      <div className="flex justify-between items-center">
        <span className="text-jx3-ink/40 text-[10px] font-bold uppercase tracking-widest">{label}</span>
        <span className={`font-mono font-black ${color}`}>
          {finalValue.toFixed(attrName === 'speed' ? 2 : 1)}
          <span className="text-[10px] ml-0.5 opacity-60">{unit}</span>
        </span>
      </div>
      
      {/* 计算过程详情 - 只有在有加成时显示 */}
      {hasBonus && (
        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-jx3-ink/30 font-mono">
          <span>{base.toFixed(1)}</span>
          {addValue !== 0 && (
            <span className="text-blue-600/60"> + {addValue.toFixed(1)}</span>
          )}
          {multValue !== 0 && (
            <span className="text-jx3-vermilion/60"> × (1 + {(multValue * 100).toFixed(0)}%)</span>
          )}
          <span> = </span>
          <span className="text-jx3-ink/60">{finalValue.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
};

export const PauseMenu: React.FC = () => {
  const showPauseMenu = useGameStore((state) => state.showPauseMenu)
  const setPaused = useGameStore((state) => state.setPaused)
  const setShowPauseMenu = useGameStore((state) => state.setShowPauseMenu)
  const setPhase = useGameStore((state) => state.setPhase)

  if (!showPauseMenu) return null

  const handleResume = () => {
    setPaused(false);
    setShowPauseMenu(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-jx3-ink/95 backdrop-blur-xl p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-[#f4f1ea] border-4 border-jx3-gold shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden rounded-sm"
        style={{
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")'
        }}
      >
        {/* 背景大字装饰 */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none flex items-center justify-center text-[30rem] font-black text-jx3-ink">
          暂
        </div>

        {/* 左侧：属性面板 */}
        <div className="flex-1 p-10 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-1.5 h-8 bg-jx3-vermilion shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]"></div>
            <div>
              <h3 className="text-3xl font-black text-jx3-ink tracking-tighter uppercase leading-none">侠士属性</h3>
              <p className="text-[9px] text-jx3-ink/40 font-bold tracking-[0.3em] mt-1 uppercase">Character Statistics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {/* 基础输出 */}
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-[11px] font-black text-jx3-vermilion uppercase tracking-[0.2em] mb-4 border-b-2 border-jx3-vermilion/10 pb-1">
                <span className="w-2 h-2 bg-jx3-vermilion rotate-45"></span>
                武学输出 / Offense
              </h4>
              <div className="space-y-1">
                <StatItem label="武学伤害" attrName="power" color="text-jx3-vermilion" />
                <StatItem label="攻击频率" attrName="speed" unit="/s" />
                <StatItem label="外功范围" attrName="range" />
              </div>
            </section>

            {/* 生存能力 */}
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-[11px] font-black text-jx3-gold uppercase tracking-[0.2em] mb-4 border-b-2 border-jx3-gold/20 pb-1">
                <span className="w-2 h-2 bg-jx3-gold rotate-45"></span>
                生存功能 / Defense
              </h4>
              <div className="space-y-1">
                <StatItem label="气血上限" attrName="maxHp" color="text-green-700" />
                <StatItem label="外功防御" attrName="armor" color="text-blue-800" />
                <StatItem label="身法速度" attrName="moveSpeed" />
                <StatItem label="拾取范围" attrName="pickupRange" />
              </div>
            </section>
          </div>

          {/* 底部装饰条 */}
          <div className="mt-12 pt-6 border-t border-jx3-ink/5 flex items-center justify-between">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-jx3-gold/30"></div>
              <div className="w-2 h-2 bg-jx3-gold/30"></div>
              <div className="w-2 h-2 bg-jx3-gold/30"></div>
            </div>
            <p className="text-[10px] text-jx3-ink/30 font-bold italic">
              "心如止水，剑指苍穹"
            </p>
          </div>
        </div>

        {/* 右侧：菜单操作 - 采用深色对比 */}
        <div className="w-full md:w-72 bg-jx3-ink p-10 flex flex-col items-center relative overflow-hidden">
          {/* 侧边装饰线 */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-jx3-gold/20"></div>
          
          <div className="mb-12 text-center">
            <h2 className="text-5xl font-black text-jx3-gold tracking-[0.4em] italic leading-none">暂停</h2>
            <div className="h-1 w-12 bg-jx3-vermilion mx-auto mt-4"></div>
          </div>
          
          <div className="w-full flex flex-col gap-5 relative z-10">
            <button 
              onClick={handleResume}
              className="group relative w-full py-5 bg-jx3-gold text-jx3-ink font-black text-xl transition-all hover:bg-white hover:-translate-y-1 active:translate-y-0 shadow-[0_4px_0_0_#b8860b] hover:shadow-[0_6px_0_0_#b8860b]"
            >
              继续战斗
            </button>

            <button 
              onClick={() => {
                handleResume();
              }}
              className="w-full py-4 bg-white/5 border border-jx3-gold/30 text-jx3-gold/80 font-bold hover:bg-white/10 transition-all text-lg"
            >
              系统设置
            </button>

            <div className="flex items-center gap-4 my-4 w-full">
              <div className="h-px flex-1 bg-jx3-gold/10"></div>
              <div className="w-1.5 h-1.5 bg-jx3-gold/20 rotate-45"></div>
              <div className="h-px flex-1 bg-jx3-gold/10"></div>
            </div>

            <button 
              onClick={() => {
                if (confirm('确定要退出当前战斗返回主菜单吗？')) {
                  handleResume();
                  setPhase('LOBBY');
                }
              }}
              className="w-full py-3 text-jx3-vermilion/60 font-bold hover:text-jx3-vermilion transition-all text-sm uppercase tracking-widest"
            >
              退出战斗
            </button>
          </div>

          <div className="mt-auto pt-10">
            <div className="px-3 py-1 border border-jx3-gold/20 rounded-full">
              <span className="text-jx3-gold/40 text-[9px] font-mono uppercase tracking-widest">
                Press <span className="text-jx3-gold font-black">ESC</span> to resume
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
