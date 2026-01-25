import React from 'react'
import { useGameStore } from '../store/useGameStore'
import { Assets } from '../assets/assets'
import { UNITS } from '../data/units'
import { CHARACTER_UI_INFOS } from '../data/characterInfo'
import { AudioAssets } from '../assets/audioAssets'
import { DIALOGUES } from '../data/dialogues'

/**
 * 2D 像素图标组件
 */
const SpriteIcon = ({ unitId, size = 64, className = "" }: { unitId: string, size?: number, className?: string }) => {
  const style = Assets.getCSS(unitId);
  return (
    <div 
      className={`pixel-art ${className}`}
      style={{
        ...style,
        width: size,
        height: size,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
};

export const CharacterSelectView = () => {
  const setPhase = useGameStore((state) => state.setPhase)
  const setSelectedCharacter = useGameStore((state) => state.setSelectedCharacter)
  
  // 状态拆分：hoveredId 负责临时预览，lockedId 负责点击后的持续锁定
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)
  const [lockedId, setLockedId] = React.useState<string | null>(null)

  // 动态获取所有可玩角色
  const playableCharacters = Object.entries(UNITS)
    .filter(([_, def]) => def.isPlayable)
    .map(([id, def]) => ({ id, ...def }))

  // 优先级逻辑：悬停预览 > 锁定选择 > 默认第一个
  const activeUnit = playableCharacters.find(c => c.id === (hoveredId || lockedId)) || playableCharacters[0]
  const activeInfo = CHARACTER_UI_INFOS[activeUnit.id] || {
    name: activeUnit.name,
    sect: '江湖',
    title: '无名侠士',
    description: '此人行踪诡秘，江湖上鲜有其传闻。',
    difficulty: 3,
    traits: [],
    displayStats: {
      health: '未知',
      speed: '未知'
    }
  }

  const handleConfirm = () => {
    if (activeUnit) {
      AudioAssets.play2D('CLICK_CONFIRM')
      setSelectedCharacter(activeUnit.id as any)
      
      // 声明式触发：我只想开始这个角色的剧情，具体内容由 Store 决定
      const { triggerDialogue } = useGameStore.getState();
      triggerDialogue(activeUnit.id);
    }
  }

  const handleBack = () => {
    AudioAssets.play2D('CLICK_PRESS')
    setPhase('LOBBY')
  }

  const handleCharMouseEnter = (id: string) => {
    if (hoveredId !== id) {
      AudioAssets.play2D('CLICK_HOVER')
      setHoveredId(id)
    }
  }

  const handleCharClick = (id: string) => {
    AudioAssets.play2D('CLICK_SELECT')
    setLockedId(id)
  }

  return (
    <div className="relative w-full h-full bg-jx3-ink overflow-hidden flex flex-col p-8 md:p-16 text-jx3-paper font-pixel">
      {/* 极简背景装饰：巨大的半透明文字 (回归右下角) */}
      <div className="absolute right-[-5%] bottom-[-10%] text-[40rem] font-black text-jx3-gold/5 pointer-events-none select-none italic leading-none z-0">
        {activeInfo.name.substring(0, 1)}
      </div>

      {/* 顶部栏：标题与返回 */}
      <div className="relative z-20 flex justify-between items-end mb-8 border-b-2 border-jx3-gold/20 pb-4">
        <div>
          <h1 className="text-5xl font-black text-jx3-gold tracking-tighter italic">侠士入世</h1>
          <p className="text-jx3-paper/40 text-[10px] font-bold tracking-widest uppercase mt-1">Select Your Hero To Enter The Arena</p>
        </div>
        <button 
          onClick={handleBack}
          className="px-6 py-2 bg-jx3-ink border border-jx3-gold/50 text-jx3-gold text-xs font-bold hover:bg-jx3-gold hover:text-jx3-ink transition-all"
        >
          返回营地
        </button>
      </div>

      {/* 上半部分：详情展示区 (高级聚光灯布局) */}
      <div className="relative z-10 flex-[1.5] flex items-center justify-center mb-12">
        <div className="w-full max-w-6xl flex flex-col md:flex-row gap-16 items-center bg-jx3-paper/5 border-y-2 border-jx3-gold/10 backdrop-blur-md p-12 relative overflow-hidden">
          {/* 背景装饰：流动的水墨感 */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_var(--tw-gradient-stops))] from-jx3-gold/10 via-transparent to-transparent opacity-50"></div>

          {/* 1. 左侧：英雄立绘预览 */}
          <div className="flex-shrink-0 relative group">
            <div className="w-72 h-72 bg-jx3-ink/40 border-2 border-jx3-gold/20 rounded-full flex items-center justify-center relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 border-4 border-jx3-gold/10 rounded-full animate-spin-slow"></div>
              {activeUnit && (
                <SpriteIcon 
                  unitId={activeUnit.id} 
                  size={200} 
                  className="relative z-10 animate-pixel-float drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" 
                />
              )}
            </div>
            {/* 装饰性文字 */}
            <div className="absolute -bottom-4 -right-4 bg-jx3-vermilion text-white text-[10px] font-black px-2 py-1 rotate-3 shadow-lg">
              SELECTED
            </div>
          </div>

          {/* 2. 右侧：整合信息面板 */}
          <div className="flex-1 flex flex-col gap-8 z-10">
            {/* 标题区 */}
            <div className="border-b-2 border-jx3-gold/20 pb-4">
              <div className="flex items-end gap-4 mb-2">
                <h2 className="text-7xl font-black text-jx3-paper tracking-tighter leading-none">{activeInfo.name}</h2>
                <span className="text-jx3-gold font-bold italic text-lg mb-1 opacity-60">/ {activeInfo.sect}</span>
              </div>
              <p className="text-jx3-gold/80 text-xl font-medium italic">"{activeInfo.title} · {activeInfo.description}"</p>
            </div>

            {/* 详情网格 */}
            <div className="grid grid-cols-2 gap-12">
              {/* 特质列 */}
              <div className="space-y-4">
                <h3 className="text-jx3-gold text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-jx3-vermilion rotate-45"></div>
                  门派特质 / Traits
                </h3>
                <div className="space-y-2 text-sm font-bold">
                  {activeInfo.traits.map((trait, i) => (
                    <div key={i} className="flex justify-between border-b border-jx3-gold/5 pb-1">
                      <span className="text-jx3-paper/50">{trait.label}</span>
                      <span className={trait.isPositive ? 'text-jx3-gold' : 'text-stone-500'}>{trait.value}</span>
                    </div>
                  ))}
                  {activeInfo.traits.length === 0 && <div className="text-jx3-paper/20 italic text-xs">暂无特质</div>}
                </div>
              </div>

              {/* 属性列 */}
              <div className="space-y-4">
                <h3 className="text-jx3-gold text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-jx3-gold rotate-45"></div>
                  基础属性 / Stats
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: '初始生命', value: activeInfo.displayStats.health },
                    { label: '身法速度', value: activeInfo.displayStats.speed },
                    { label: '上手难度', value: '★'.repeat(activeInfo.difficulty) + '☆'.repeat(5 - activeInfo.difficulty), isSpecial: true }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-[10px] text-jx3-paper/30 font-bold uppercase">{stat.label}</span>
                      <span className={`text-lg font-black ${stat.isSpecial ? 'text-jx3-vermilion' : 'text-jx3-paper'}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 操作区：整合进面板 */}
            <div className="mt-4 flex items-center justify-between bg-jx3-gold/5 p-4 border border-jx3-gold/10">
              <div className="flex flex-col">
                <span className="text-[9px] text-jx3-gold/40 font-bold uppercase tracking-widest">Confirmation</span>
                <span className="text-xs text-jx3-paper/60 font-bold">{lockedId ? `已锁定: ${activeInfo.name}` : '请在下方选择侠士'}</span>
              </div>
              <button 
                onClick={handleConfirm}
                className={`
                  px-12 py-4 font-black text-2xl transition-all shadow-[4px_4px_0_0_rgba(227,66,52,0.4)] relative overflow-hidden
                  ${lockedId ? 'bg-jx3-gold text-jx3-ink hover:bg-white hover:scale-105 active:scale-95' : 'bg-jx3-paper/10 text-jx3-paper/20 cursor-not-allowed'}
                `}
                disabled={!lockedId}
              >
                踏入江湖
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 下半部分：小图标选择区 (占据约 40% 高度) - 采用流式中心布局 */}
      <div 
        className="relative z-10 flex-[0.8] min-h-0 flex flex-col"
        onMouseLeave={() => setHoveredId(null)}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar p-8 mask-fade-edges">
          <div className="flex flex-wrap justify-center gap-4 w-full mx-auto px-4">
            {playableCharacters.map((char) => {
              const isHovered = hoveredId === char.id;
              const isLocked = lockedId === char.id;
              const isDefault = !hoveredId && !lockedId && activeUnit?.id === char.id;

              return (
                <div 
                  key={char.id}
                  onMouseEnter={() => handleCharMouseEnter(char.id)}
                  onClick={() => handleCharClick(char.id)}
                  className={`
                    w-20 h-20 flex items-center justify-center cursor-pointer transition-all duration-200 ease-out border-2 relative
                    ${isLocked 
                      ? 'bg-jx3-gold border-jx3-paper scale-110 z-30 shadow-[0_0_20px_rgba(212,175,55,0.8)] ring-2 ring-jx3-vermilion/50' 
                      : isHovered
                        ? 'bg-jx3-gold/30 border-jx3-gold/60 scale-105 z-20'
                        : isDefault
                          ? 'bg-jx3-paper/20 border-jx3-gold/40'
                          : 'bg-jx3-paper/15 border-jx3-gold/10 hover:border-jx3-gold/40'}
                `}
              >
                <SpriteIcon 
                  unitId={char.id as any} 
                  size={32} 
                  className={`transition-all duration-200 ${(isLocked || isHovered || isDefault) ? 'opacity-100' : 'opacity-70'}`}
                />
                
                {/* 锁定角标 */}
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-jx3-vermilion rotate-45 border border-jx3-paper shadow-sm"></div>
                )}
              </div>
            );
          })}
          
          {/* 填充占位符 */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={`placeholder-${i}`}
              className="w-20 h-20 border-2 border-dashed border-jx3-gold/5 bg-jx3-paper/5 flex items-center justify-center opacity-20"
            >
              <div className="text-2xl text-jx3-gold italic font-bold opacity-30">?</div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
