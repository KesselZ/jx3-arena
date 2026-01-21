import { Sky, ContactShadows, Environment } from '@react-three/drei'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../game/config'

export function Stage() {
  const themeKey = useGameStore((state) => state.theme)
  const theme = GAME_CONFIG.THEMES[themeKey]

  return (
    <>
      {/* 1. 设置 Canvas 背景色，必须与雾气/天空底色一致，防止闪烁 */}
      <color attach="background" args={[theme.skyColor]} />
      
      {/* 2. 天空盒 */}
      <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />
      
      {/* 3. 统一光照 */}
      <ambientLight intensity={theme.ambientIntensity} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      
      {/* 4. 雾气：远端自然淡出 */}
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />

      {/* 5. 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color={theme.groundColor} roughness={1} />
      </mesh>

      {/* 6. 软阴影 */}
      <ContactShadows 
        opacity={0.4} 
        scale={40} 
        blur={2} 
        far={10} 
        resolution={256} 
        color="#000000" 
      />
      
      <Environment preset="park" />
    </>
  )
}
