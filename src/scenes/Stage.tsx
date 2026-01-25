import { Sky, Environment, Instances, Instance } from '@react-three/drei'
import { useGameStore } from '../store/useGameStore'
import { GAME_CONFIG } from '../data/config'
import * as THREE from 'three'
import { useMemo } from 'react'

export function Stage() {
  const themeKey = useGameStore((state) => state.theme)
  const setArenaSeats = useGameStore((state) => state.setArenaSeats)
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

  // 1.1 背景噪点贴图：用于 -2 高度的远景地面
  const bgNoiseTexture = useMemo(() => {
    const tex = noiseTexture.clone()
    tex.repeat.set(200, 200) // 让纹理在广阔的背景上重复更多次，显得更细碎
    return tex
  }, [noiseTexture])

  // 1.2 栏杆木纹贴图：增加细节感
  const woodTexture = useMemo(() => {
    const size = 128 // 增加分辨率
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // 基础色：更明亮的浅木色/原木色
    ctx.fillStyle = '#b5a489' 
    ctx.fillRect(0, 0, size, size)
    
    // 绘制更明显的木纹
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`
      const h = Math.random() * 4 + 2
      ctx.fillRect(0, Math.random() * size, size, h)
    }
    
    // 增加一些浅色木质纤维
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`
      const h = Math.random() * 2 + 1
      ctx.fillRect(0, Math.random() * size, size, h)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    // 调整采样，让纹理更清晰
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearMipmapLinearFilter
    return tex
  }, [])

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

  // 3. 核心技术点：席位锚点采集 (已移除，改用更可靠的射线检测法)
  return (
    <>
      {/* 1. 基础环境 */}
      <color attach="background" args={[theme.skyColor]} />
      <Sky 
        distance={450000} 
        sunPosition={[25, 35, 25]} 
        inclination={0} 
        azimuth={0.25} 
      />
      
      {/* 极低的环境光，强制拉开明暗差距 */}
      <ambientLight intensity={0.2} />
      
      {/* 强力主光源（太阳光） */}
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
        {/* 【主擂台实体】 */}
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

        {/* 擂台侧边实体 */}
        <mesh position={[0, -1.01, 0]} receiveShadow castShadow>
          <boxGeometry args={[bx * 2, 2, bz * 2]} />
          <meshStandardMaterial color="#4a3a2a" roughness={1} />
        </mesh>

        {/* 【实例化优化：看台与基座】 - 使用 Box 实例化 */}
        <Instances range={100} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial roughness={1} />
          
          {/* 1. 竞技场看台 */}
          {GAME_CONFIG.ARENA.STANDS.map((stand) => (
            <group key={stand.id} position={stand.center as [number, number, number]}>
              {Array.from({ length: GAME_CONFIG.ARENA.LEVEL_COUNT }).map((_, level) => {
                const shrink = level * 8
                const currentWidth = stand.size[0] - (stand.center[0] !== 0 ? shrink : 0)
                const currentDepth = stand.size[2] - (stand.center[2] !== 0 ? shrink : 0)
                return (
                  <Instance 
                    key={level}
                    position={[0, (level * GAME_CONFIG.ARENA.LEVEL_HEIGHT) + GAME_CONFIG.ARENA.BASE_Y, 0]}
                    scale={[currentWidth, GAME_CONFIG.ARENA.LEVEL_HEIGHT, currentDepth]}
                    color={level % 2 === 0 ? "#2a1a0a" : "#1a0a00"}
                  />
                )
              })}
            </group>
          ))}

          {/* 2. 火炬塔基座 */}
          {[
            [bx + 2, bz + 2], [bx + 2, -bz - 2], [-bx - 2, bz + 2], [-bx - 2, -bz - 2]
          ].map(([x, z], i) => (
            <Instance 
              key={`tower-base-${i}`}
              position={[x, -1.5, z]}
              scale={[2, 1, 2]}
              color="#2a1a0a"
            />
          ))}
        </Instances>

        {/* 【实例化优化：圆柱体组件】 - 塔身、托盘、围绳、立柱 */}
        <Instances range={200} castShadow>
          <cylinderGeometry args={[1, 1, 1, 8]} />
          <meshStandardMaterial roughness={0.5} />

          {/* 1. 火炬塔身 */}
          {[
            [bx + 2, bz + 2], [bx + 2, -bz - 2], [-bx - 2, bz + 2], [-bx - 2, -bz - 2]
          ].map(([x, z], i) => (
            <group key={`tower-cyls-${i}`} position={[x, -2, z]}>
              <Instance 
                position={[0, 5, 0]} 
                scale={[0.8, 10, 0.8]} 
                color="#1a1a1a"
              />
              <Instance 
                position={[0, 10, 0]} 
                scale={[1.5, 0.5, 1.5]}
                color="#333"
              />
            </group>
          ))}

          {/* 2. 围绳 */}
          {[
            { pos: [0, 0, bz], rot: [0, 0, 0], len: bx * 2 },
            { pos: [0, 0, -bz], rot: [0, 0, 0], len: bx * 2 },
            { pos: [bx, 0, 0], rot: [0, Math.PI / 2, 0], len: bz * 2 },
            { pos: [-bx, 0, 0], rot: [0, Math.PI / 2, 0], len: bz * 2 },
          ].map((side, i) => (
            <group key={`side-${i}`} position={side.pos as [number, number, number]} rotation={side.rot as [number, number, number]}>
              {[0.4, 0.8, 1.2].map((h) => (
                <Instance 
                  key={h} 
                  position={[0, h, 0]} 
                  rotation={[0, 0, Math.PI / 2]}
                  scale={[0.05, side.len, 0.05]}
                  color="#e34234"
                />
              ))}
            </group>
          ))}

          {/* 3. 立柱 */}
          {[
            [bx, bz], [bx, -bz], [-bx, bz], [-bx, -bz]
          ].map(([x, z], i) => (
            <Instance 
              key={`post-${i}`} 
              position={[x, 0.75, z]} 
              scale={[0.2, 1.5, 0.2]}
              color="#333"
            />
          ))}
        </Instances>

        {/* 【火炬顶端：球体与灯光】 */}
        <group>
          {[
            [bx + 2, bz + 2], [bx + 2, -bz - 2], [-bx - 2, bz + 2], [-bx - 2, -bz - 2]
          ].map(([x, z], i) => (
            <group key={`torch-light-${i}`} position={[x, 9, z]}>
              <pointLight intensity={1500} color="#ff0000" distance={300} decay={2} />
              <mesh>
                <sphereGeometry args={[1.2, 16, 16]} />
                <meshStandardMaterial color="#ffffff" emissive="#ff0000" emissiveIntensity={50} />
              </mesh>
            </group>
          ))}
        </group>

        {/* 外部视觉地面 */}
        <mesh name="ground-plane" rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial 
            color="#2a2520" 
            map={bgNoiseTexture}
            roughness={1} 
            metalness={0}
          />
        </mesh>
      </group>

      <Environment preset="sunset" />
    </>
  )
}
