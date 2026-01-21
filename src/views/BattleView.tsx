import { Canvas, useFrame } from '@react-three/fiber'
import { Billboard, OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC } from '../entities/npc'
import { world, Entity } from '../game/world'
import { useEntities } from 'miniplex-react'
import { useKeyboard } from '../hooks/useKeyboard'
import { movementSystem } from '../systems/movementSystem'
import { aiSystem } from '../systems/aiSystem'
import { spawnSystem, resetSpawner } from '../systems/spawnSystem'
import { GAME_CONFIG } from '../game/config'
import { PixelSprite } from '../components/Sprites'
import { Stage } from '../components/Stage'
import * as THREE from 'three'

// 单个实体的表现层组件
function EntityView({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group>(null)
  const isPlayer = entity.type === 'player'
  const keys = useKeyboard()

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // 如果是玩家，处理输入（只负责改速度，不负责位移逻辑）
    if (isPlayer) {
      const moveSpeed = GAME_CONFIG.BATTLE.PLAYER_INITIAL_SPEED
      const vel = entity.velocity
      vel.x = 0; vel.z = 0;

      if (keys.current['KeyW']) vel.z -= moveSpeed
      if (keys.current['KeyS']) vel.z += moveSpeed
      if (keys.current['KeyA']) vel.x -= moveSpeed
      if (keys.current['KeyD']) vel.x += moveSpeed
    }

    // 同步位置
    groupRef.current.position.set(entity.position.x, entity.position.y, entity.position.z)
  })

  // 左右翻转逻辑
  const flipX = entity.velocity.x !== 0 ? entity.velocity.x < 0 : false

  return (
    <group ref={groupRef}>
      {/* Billboard 确保精灵图始终面对摄像机，实现 HD-2D 效果 */}
      <Billboard follow={true}>
        <PixelSprite 
          unitId={entity.unitId} 
          scale={isPlayer ? 1.5 : 1.2} 
          flipX={flipX}
        />
      </Billboard>
      
      {/* 角色脚底的装饰阴影 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// 实体管理器，负责渲染世界中的所有实体
function Entities() {
  const entities = useEntities(world);

  return (
    <>
      {[...entities].map((entity) => (
        <EntityView key={entity.id} entity={entity} />
      ))}
    </>
  )
}

function BattleScene() {
  const selectedCharacter = useGameStore((state) => state.selectedCharacter)
  const currentWave = useGameStore((state) => state.wave)
  const elapsedTime = useRef(0)

  useFrame((state, delta) => {
    elapsedTime.current += delta
    
    // 1. 刷怪系统
    spawnSystem(delta, elapsedTime.current, currentWave)

    // 2. AI 系统
    aiSystem(delta)

    // 3. 位移物理系统
    movementSystem(delta)
  })

  useEffect(() => {
    if (!selectedCharacter) return

    // 每一波开始重置刷怪器
    resetSpawner()
    elapsedTime.current = 0

    // 1. 生成选择的主角
    createPlayer(selectedCharacter, 0, 0)
    
    // 2. 生成一个初始友军
    createNPC('ally_chunyang', 'ally', -2, -2)
    
    // 3. 初始随机生成几个敌人，增加开场感
    const waveConfig = GAME_CONFIG.WAVES[currentWave as keyof typeof GAME_CONFIG.WAVES] || GAME_CONFIG.WAVES[1]
    for(let i=0; i<GAME_CONFIG.BATTLE.INITIAL_ENEMIES; i++) {
      const spawnPos = {
        x: (Math.random() - 0.5) * GAME_CONFIG.BATTLE.SCREEN_BOUNDS.x * 2,
        z: (Math.random() - 0.5) * GAME_CONFIG.BATTLE.SCREEN_BOUNDS.z * 2
      }
      const randomUnitId = waveConfig.pool[Math.floor(Math.random() * waveConfig.pool.length)]
      createNPC(randomUnitId, 'enemy', spawnPos.x, spawnPos.z)
    }

    return () => world.clear()
  }, [selectedCharacter, currentWave])

  return (
    <>
      <PerspectiveCamera makeDefault position={GAME_CONFIG.VISUAL.CAMERA_OFFSET} fov={40} />
      <OrbitControls makeDefault enablePan={false} />
      
      <Stage />
      <Entities />
    </>
  )
}

export const BattleView = () => {
  const setPhase = useGameStore((state) => state.setPhase)
  const wave = useGameStore((state) => state.wave)

  return (
    <div className="w-full h-full relative">
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <Suspense fallback={null}>
            <BattleScene />
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="pixel-panel border-jx3-gold !bg-jx3-ink !text-jx3-gold">
            <h2 className="font-bold tracking-tighter">第 {wave} 波</h2>
            <div className="w-48 h-4 bg-jx3-wood border-2 border-jx3-ink mt-2 relative">
              <div className="h-full bg-jx3-vermilion" style={{ width: '80%' }}></div>
            </div>
          </div>
          <button 
            onClick={() => setPhase('LOBBY')}
            className="px-4 py-2 bg-jx3-paper text-jx3-ink font-bold border-b-4 border-r-4 border-jx3-ink hover:bg-white active:translate-x-[2px] active:translate-y-[2px] active:border-b-0 active:border-r-0 transition-all"
          >
            回营
          </button>
        </div>

        <div className="flex justify-center mb-10">
          <div className="pixel-panel !py-2 !px-6 bg-jx3-paper border-2 animate-pulse text-sm font-bold">
            HD-2D 模式：精灵图始终面对摄像机
          </div>
        </div>
      </div>
    </div>
  )
}
