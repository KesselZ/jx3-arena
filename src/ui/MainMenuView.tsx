import { useGameStore } from '../store/useGameStore'
import { AudioAssets } from '../assets/audioAssets'

export const MainMenuView = () => {
  const setPhase = useGameStore((state) => state.setPhase)

  const handleStart = () => {
    AudioAssets.play2D('CLICK_CLEAN');
    setPhase('CHARACTER_SELECT');
  };

  return (
    <div className="relative w-full h-full bg-jx3-ink overflow-hidden flex flex-col items-center justify-center p-12">
      {/* 背景装饰：大幅的水墨感渐变或纹理 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-jx3-gold/40 via-transparent to-transparent"></div>
      
      {/* 左侧装饰：巨大的书法感文字背景 (模拟) */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-[20rem] font-black text-white/5 select-none pointer-events-none leading-none">
        剑
      </div>
      <div className="absolute right-10 top-1/2 -translate-y-1/2 text-[20rem] font-black text-white/5 select-none pointer-events-none leading-none">
        心
      </div>

      {/* 主标题区域：占据页面上半部分 */}
      <div className="relative z-10 flex flex-col items-center mb-24 animate-pixel-float">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-[2px] bg-jx3-gold/50"></div>
          <span className="text-jx3-gold text-sm tracking-[0.5em] font-bold">PIXEL WUXIA SURVIVAL</span>
          <div className="w-12 h-[2px] bg-jx3-gold/50"></div>
        </div>
        
        <h1 className="text-8xl font-black text-jx3-paper tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] relative">
          JX3 Arena
          <div className="absolute -bottom-4 left-0 w-full h-2 bg-jx3-vermilion/80 skew-x-[-20deg]"></div>
        </h1>
        
        <p className="mt-8 text-jx3-gold/80 text-lg tracking-[1em] ml-[1em] font-bold">
          剑网三·竞技场
        </p>
      </div>
      
      {/* 按钮区域：横向排布或大尺寸纵向 */}
      <div className="relative z-10 flex flex-row gap-8 items-center justify-center w-full max-w-4xl">
        <button
          onClick={handleStart}
          className="group relative px-12 py-6 bg-jx3-paper border-4 border-jx3-ink shadow-[8px_8px_0_0_rgba(212,175,55,0.3)] hover:shadow-[12px_12px_0_0_rgba(212,175,55,0.5)] hover:-translate-x-1 hover:-translate-y-1 active:translate-x-1 active:translate-y-1 transition-all"
        >
          <div className="absolute inset-1 border border-jx3-ink/10 pointer-events-none"></div>
          <span className="text-3xl font-black text-jx3-ink group-hover:text-jx3-vermilion transition-colors">踏入江湖</span>
          <div className="absolute -right-2 -top-2 w-4 h-4 bg-jx3-vermilion rotate-45"></div>
        </button>
        
        <div className="flex flex-col gap-4">
          <button className="px-8 py-3 bg-jx3-ink border-2 border-jx3-gold/30 text-jx3-gold/50 font-bold hover:border-jx3-gold hover:text-jx3-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed" disabled>
            武林成就
          </button>
          <button className="px-8 py-3 bg-jx3-ink border-2 border-jx3-gold/30 text-jx3-gold/50 font-bold hover:border-jx3-gold hover:text-jx3-gold transition-all disabled:opacity-30 disabled:cursor-not-allowed" disabled>
            英雄榜
          </button>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-12 left-12 right-12 h-px bg-gradient-to-r from-transparent via-jx3-gold/20 to-transparent"></div>
      <div className="absolute bottom-8 text-jx3-gold/30 text-[10px] tracking-widest">
        © 2026 JX3 ARENA PROJECT. ALL RIGHTS RESERVED.
      </div>
    </div>
  )
}
