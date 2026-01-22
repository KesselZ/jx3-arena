import { useGameStore } from '../store/useGameStore'
import { Assets } from '../assets/assets'
import { UNITS } from '../data/units'

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

  // 动态获取所有可玩角色
  const playableCharacters = Object.entries(UNITS)
    .filter(([_, def]) => def.isPlayable)
    .map(([id, def]) => ({ id, ...def }))

  const handleSelect = (id: string) => {
    setSelectedCharacter(id as any)
    setPhase('BATTLE')
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-jx3-ink bg-jx3-ink">
      <div className="pixel-panel max-w-2xl w-full flex flex-col items-center animate-pixel-float">
        <h1 className="text-4xl font-black text-jx3-ink mb-8 tracking-tighter">
          选择侠士
        </h1>
        
        <div className="grid grid-cols-2 gap-8 w-full">
          {playableCharacters.map((char) => (
            <div 
              key={char.id}
              onClick={() => handleSelect(char.id)}
              className="flex flex-col items-center p-6 border-2 border-jx3-wood/20 hover:border-jx3-gold hover:bg-jx3-gold/10 cursor-pointer transition-all rounded-pixel-md group"
            >
              <SpriteIcon unitId={char.id as any} size={80} className="mb-4 group-hover:scale-110 transition-transform" />
              <h2 className="text-2xl font-bold text-jx3-ink mb-2">{char.name}</h2>
              <p className="text-xs text-jx3-wood font-medium text-center leading-relaxed">
                {char.description}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setPhase('LOBBY')}
          className="mt-10 text-jx3-wood/60 hover:text-jx3-ink text-sm font-bold border-b border-jx3-wood/20 hover:border-jx3-ink transition-all"
        >
          返回营地
        </button>
      </div>
    </div>
  )
}
