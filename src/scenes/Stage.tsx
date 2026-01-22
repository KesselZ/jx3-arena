import { Sky, ContactShadows, Environment, Float, Image } from '@react-three/drei'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../game/config'
import * as THREE from 'three'
import { useMemo } from 'react'

export function Stage() {
  const themeKey = useGameStore((state) => state.theme)
  const theme = GAME_CONFIG.THEMES[themeKey]
  const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS

  // 1. 核心技术点：微型噪点贴图 (Noise Texture) + 邻近采样 (Nearest Filter)
  const noiseTexture = useMemo(() => {
    const size = 32 
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const v = Math.floor(Math.random() * 80) + 175
        ctx.fillStyle = `rgb(${v},${v},${v})`
        ctx.fillRect(x, y, 1, 1)
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(bx, bz) 
    return tex
  }, [bx, bz])

  // 2. 核心技术点：程序化生成顶点色 (Vertex Colors) + 几何体造型
  const { geometry } = useMemo(() => {
    const width = bx * 2
    const height = bz * 2
    const geo = new THREE.PlaneGeometry(width, height, 40, 40)
    const count = geo.attributes.position.count
    const colors = new Float32Array(count * 3)
    
    const baseColor = new THREE.Color(theme.groundColor)
    const tempColor = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const noise = Math.random() * 0.15
      tempColor.copy(baseColor).multiplyScalar(1 - noise)
      colors[i * 3] = tempColor.r
      colors[i * 3 + 1] = tempColor.g
      colors[i * 3 + 2] = tempColor.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: geo }
  }, [theme.groundColor, bx, bz])

  return (
    <>
      {/* 1. 基础环境 */}
      <color attach="background" args={[theme.skyColor]} />
      
      {/* 极低的环境光，强制拉开明暗差距 */}
      <ambientLight intensity={0.2} />
      
      {/* 强力主光源（太阳光）：
          - 强度大幅提升至 2.5
          - 位置进一步降低，产生更长、更明显的投影
      */}
      <directionalLight 
        position={[25, 35, 25]} 
        intensity={2.5} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0001}
      />

      <fog attach="fog" args={[theme.fog.color, theme.fog.near, theme.fog.far]} />

      <group>
        {/* 【主擂台实体】 - 增加厚度并向下延伸，确保接触到 -2 海拔的地面 */}
        <mesh 
          position={[0, 0, 0]} 
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={geometry}
          receiveShadow 
        >
          <meshStandardMaterial 
            map={noiseTexture}
            vertexColors={true}   
            flatShading={true}    
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* 擂台侧边实体 - 稍微下移 0.01，防止顶面与海拔 0 的擂台面发生 Z-Fighting */}
        <mesh position={[0, -1.01, 0]} receiveShadow castShadow>
          <boxGeometry args={[bx * 2, 2, bz * 2]} />
          <meshStandardMaterial color="#4a3a2a" roughness={1} />
        </mesh>

        {/* 【竞技场看台】 - 宏大的环绕式阶梯结构 (放大并拉远) */}
        <group position={[0, -2, 0]}>
          {[
            { pos: [0, 0, bz + 75], size: [(bx * 2 + 150) * 2, 20, 100] },    
            { pos: [0, 0, -bz - 75], size: [(bx * 2 + 150) * 2, 20, 100] },   
            { pos: [bx + 75, 0, 0], size: [100, 20, (bz * 2 + 150) * 2] },    
            { pos: [-bx - 75, 0, 0], size: [100, 20, (bz * 2 + 150) * 2] },   
          ].map((stand, i) => (
            <group key={i} position={stand.pos as [number, number, number]}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <mesh 
                  key={level} 
                  position={[0, level * 3, 0]} 
                  receiveShadow 
                  castShadow
                >
                  <boxGeometry args={[
                    stand.size[0] - (stand.pos[0] !== 0 ? level * 8 : 0), 
                    3, 
                    stand.size[2] - (stand.pos[2] !== 0 ? level * 8 : 0)
                  ]} />
                  <meshStandardMaterial 
                    color={level % 2 === 0 ? "#2a1a0a" : "#1a0a00"} 
                    roughness={1} 
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>

        {/* 【四个角落的巨型火炬塔】 - 底部对齐海拔 -2 */}
        {[
          [bx + 2, bz + 2], [bx + 2, -bz - 2], [-bx - 2, bz + 2], [-bx - 2, -bz - 2]
        ].map(([x, z], i) => (
          <group key={i} position={[x, -2, z]}>
            {/* 塔基座 */}
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[2, 1, 2]} />
              <meshStandardMaterial color="#2a1a0a" roughness={1} />
            </mesh>
            {/* 塔身 - 进一步加高 */}
            <mesh position={[0, 5, 0]} castShadow>
              <cylinderGeometry args={[0.6, 1.0, 10, 8]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* 顶部灯珠托盘 */}
            <mesh position={[0, 10, 0]} castShadow>
              <cylinderGeometry args={[1.5, 0.6, 0.5, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            {/* 增强光源：强度提升，珠子更大。注意：关闭 castShadow 以节省数千个 DrawCall */}
            <pointLight position={[0, 11, 0]} intensity={80} color="#ffaa00" distance={150} />
            <mesh position={[0, 11, 0]}>
              <sphereGeometry args={[1.2, 32, 32]} />
              <meshStandardMaterial color="#ffffff" emissive="#ff6600" emissiveIntensity={15} />
            </mesh>
          </group>
        ))}

        {/* 外部视觉地面：海拔 -2，角色永远去不到的背景 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#1a1a1a" roughness={1} />
        </mesh>
      </group>

      {/* 7. 移除软阴影 (ContactShadows)，改用锐利的实时阴影 */}
      {/* <ContactShadows 
        opacity={0.8} 
        scale={80} 
        blur={1.2} 
        far={2} 
        resolution={1024} 
        color="#000000" 
      /> */}
      
      <Environment preset="sunset" />
    </>
  )
}
