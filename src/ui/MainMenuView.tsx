import { useGameStore } from '../store/useGameStore'

export const MainMenuView = () => {
  const setPhase = useGameStore((state) => state.setPhase)

  return (
    <div className="flex flex-col items-center justify-center h-full text-jx3-ink bg-jx3-ink">
      {/* 浮动效果应用于整个主面板 */}
      <div className="pixel-panel max-w-md w-full flex flex-col items-center animate-pixel-float">
        <div className="absolute -top-6 -left-6 w-12 h-12 border-t-4 border-l-4 border-jx3-gold"></div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 border-b-4 border-r-4 border-jx3-gold"></div>

        <h1 className="text-5xl font-black text-jx3-ink mb-2 tracking-tighter drop-shadow-sm">
          拯救古之岚
        </h1>
        <div className="h-1 w-32 bg-jx3-vermilion mb-8 animate-pixel-blink"></div>
        
        <div className="flex flex-col gap-6 w-full">
          <button
            onClick={() => setPhase('CHARACTER_SELECT')}
            className="pixel-btn-gold text-2xl group"
          >
            <span className="inline-block group-hover:scale-110 transition-transform">踏入江湖</span>
          </button>
          
          <button className="pixel-btn-stone" disabled>
            武林成就
          </button>

          <button className="pixel-btn-stone" disabled>
            英雄榜
          </button>
        </div>

        <p className="mt-12 text-jx3-wood/60 text-xs font-bold tracking-widest uppercase">
          Pixel Wuxia Survival Project
        </p>
      </div>
    </div>
  )
}
