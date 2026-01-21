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
        intensity={0.2} 
        castShadow 
        shadow-mapSize={[2048, 2048]} // 提高阴影分辨率
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* 4. 雾气：远端自然淡出 */}
      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />

      {/* 5. 地面：接收投影 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color={theme.groundColor} roughness={1} />
      </mesh>

      {/* 6. 调试用灯光：在场景中放置几个彩色点光源，测试 HD-2D 体积感 */}
      <pointLight position={[5, 2, 5]} intensity={50} color="#ffaa00" castShadow />
      <pointLight position={[-5, 2, -5]} intensity={50} color="#00aaff" castShadow />
      <pointLight position={[0, 5, 0]} intensity={30} color="#ffffff" />
      
      {/* 7. 软阴影 */}
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
