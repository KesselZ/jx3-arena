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
import { inputSystem } from '../systems/inputSystem'
import { GAME_CONFIG } from '../game/config'
import { PixelSprite } from '../components/Sprites'
import { UNITS } from '../assets/assets'
import { Stage } from '../components/Stage'
import * as THREE from 'three'

/**
 * 表现层：EntityView
 * 职责：仅负责将实体数据同步到 3D 渲染，不含任何逻辑
 */
function EntityView({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group>(null)
  
  // 从 UNITS 注册表中获取该角色的预设缩放，默认为 1.0
  const unitDef = UNITS[entity.unitId as keyof typeof UNITS]
  const baseScale = (unitDef as any).scale || 1.0

  useFrame(() => {
    if (!groupRef.current) return
    // 同步物理位置到渲染位置
    groupRef.current.position.set(entity.position.x, entity.position.y, entity.position.z)
  })

  // 左右翻转逻辑
  const defaultFacing = (unitDef as any).facing || 'right'
  let flipX = false
  if (entity.velocity.x !== 0) {
    // 如果原始图片朝右，往左走(x<0)就翻转；如果原始图片朝左，往右走(x>0)就翻转
    flipX = defaultFacing === 'right' ? entity.velocity.x < 0 : entity.velocity.x > 0
  }

  return (
    <group ref={groupRef}>
      <Billboard follow={true}>
        <PixelSprite 
          unitId={entity.unitId} 
          scale={baseScale} 
          flipX={flipX}
        />
      </Billboard>
      
      {/* 角色脚底阴影：大小也随角色缩放微调 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3 * baseScale, 32]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

/**
 * 容器层：Entities
 * 职责：负责渲染世界中的所有实体实例
 */
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

/**
 * 逻辑编排层：BattleScene
 * 职责：搭建 3D 场景并运行 ECS 所有系统
 */
function BattleScene() {
  const selectedCharacter = useGameStore((state) => state.selectedCharacter)
  const currentWave = useGameStore((state) => state.wave)
  const elapsedTime = useRef(0)
  const keys = useKeyboard()

  // ECS 系统循环：逻辑与渲染分离
  useFrame((state, delta) => {
    elapsedTime.current += delta
    
    // 1. 输入处理：按键 -> 修改玩家速度
    inputSystem(keys.current)

    // 2. 刷怪逻辑：时间 -> 生成新实体
    spawnSystem(delta, elapsedTime.current, currentWave)

    // 3. AI 逻辑：决策 -> 修改 NPC 速度
    aiSystem(delta)

    // 4. 位移物理：速度 -> 修改实体位置
    movementSystem(delta)
  })

  useEffect(() => {
    if (!selectedCharacter) return

    // 波次初始化
    resetSpawner()
    elapsedTime.current = 0

    // 1. 生成主角
    createPlayer(selectedCharacter, 0, 0)
    
    // 2. 生成一个初始友军
    createNPC('ally_chunyang', 'ally', -2, -2)
    
    // 3. 初始随机敌人
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

/**
 * UI 视图层：BattleView
 * 职责：布局 Canvas 和覆盖的 UI 信息
 */
export const BattleView = () => {
  const setPhase = useGameStore((state) => state.setPhase)
  const wave = useGameStore((state) => state.wave)

  return (
    <div className="w-full h-full relative">
      {/* 3.D 渲染层 */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <Suspense fallback={null}>
            <BattleScene />
          </Suspense>
        </Canvas>
      </div>

      {/* 2D UI 覆盖层 */}
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
            HD-2D 模式：精英架构，逻辑与表现彻底解耦
          </div>
        </div>
      </div>
    </div>
  )
}
