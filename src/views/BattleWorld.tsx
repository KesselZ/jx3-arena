import { useFrame } from '@react-three/fiber'
import { Billboard, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'

import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC } from '../entities/npc'
import { world } from '../game/world'
import { useKeyboard } from '../hooks/useKeyboard'
import { resetSpawner } from '../systems/spawnSystem'
import { GAME_CONFIG } from '../game/config'
import { PixelSprite } from '../components/Sprites'
import { UNITS } from '../assets/assets'
import { Stage } from '../components/Stage'
import { useSmoothCamera } from '../hooks/useSmoothCamera'
import { useBattleSystems } from '../hooks/useBattleSystems'

/**
 * 单个实体的 3D 表现层
 */
function EntityView({ entity, cameraRight, playerPosition }: any) {
  const groupRef = useRef<THREE.Group>(null)
  const unitDef = UNITS[entity.unitId as keyof typeof UNITS]
  const baseScale = (unitDef as any).scale || 1.0
  const defaultFacing = (unitDef as any).facing || 'right'
  const tempVec = useRef(new THREE.Vector3())
  const moveVec = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.set(entity.position.x, entity.position.y, entity.position.z)

    let shouldFlip = false
    if (entity.ai?.targetId === 'player-main' && playerPosition) {
      tempVec.current.set(playerPosition.x - entity.position.x, 0, playerPosition.z - entity.position.z)
      const dot = tempVec.current.dot(cameraRight)
      if (Math.abs(dot) > 0.1) {
        shouldFlip = defaultFacing === 'right' ? dot < 0 : dot > 0
      } else if (entity.velocity.x !== 0 || entity.velocity.z !== 0) {
        moveVec.current.set(entity.velocity.x, 0, entity.velocity.z)
        shouldFlip = defaultFacing === 'right' ? moveVec.current.dot(cameraRight) < 0 : moveVec.current.dot(cameraRight) > 0
      }
    } else if (entity.velocity.x !== 0 || entity.velocity.z !== 0) {
      moveVec.current.set(entity.velocity.x, 0, entity.velocity.z)
      shouldFlip = defaultFacing === 'right' ? moveVec.current.dot(cameraRight) < 0 : moveVec.current.dot(cameraRight) > 0
    }

    const spriteMesh = groupRef.current.getObjectByName('pixel-sprite-mesh')
    if (spriteMesh) spriteMesh.scale.x = shouldFlip ? -1 : 1
  })

  const healthPercent = Math.max(0, entity.health.current / entity.health.max)
  const barColor = entity.type === 'enemy' ? '#ef4444' : '#4ade80'

  return (
    <group ref={groupRef}>
      <Billboard follow={true}>
        <PixelSprite 
          unitId={entity.unitId} 
          scale={baseScale} 
          velocity={entity.velocity}
          lastHitTime={entity.health.lastHitTime}
        />
        <group position={[0, baseScale + 0.2, 0]}>
          <mesh><planeGeometry args={[0.8, 0.08]} /><meshBasicMaterial color="#1a1a1a" transparent opacity={0.8} /></mesh>
          <mesh position={[-(1 - healthPercent) * 0.4, 0, 0.01]} scale={[healthPercent, 1, 1]}>
            <planeGeometry args={[0.8, 0.08]} /><meshBasicMaterial color={barColor} />
          </mesh>
        </group>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.25 * baseScale, 32]} /><meshBasicMaterial color="black" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

/**
 * 实体渲染管理器
 */
function Entities() {
  const entities = useEntities(world)
  const cameraRight = useRef(new THREE.Vector3())
  const playerPos = useRef(new THREE.Vector3())
  const hasPlayer = useRef(false)

  useFrame((state) => {
    cameraRight.current.set(1, 0, 0).applyQuaternion(state.camera.quaternion).setComponent(1, 0).normalize()
    const player = world.entities.find(e => e.id === 'player-main')
    if (player) {
      playerPos.current.set(player.position.x, player.position.y, player.position.z)
      hasPlayer.current = true
    } else {
      hasPlayer.current = false
    }
  })

  return (
    <>
      {[...entities].map((entity) => (
        <EntityView 
          key={entity.id} 
          entity={entity} 
          cameraRight={cameraRight.current} 
          playerPosition={hasPlayer.current ? playerPos.current : null} 
        />
      ))}
    </>
  )
}

/**
 * 战斗场景 3D 世界入口
 */
export function BattleWorld() {
  const selectedCharacter = useGameStore((state) => state.selectedCharacter)
  const currentWave = useGameStore((state) => state.wave)
  const keys = useKeyboard()
  const orbitControlsRef = useRef<any>(null)

  // 1. 运行核心逻辑系统
  const { elapsedTime } = useBattleSystems(keys, currentWave)

  // 2. 运行相机控制器
  useSmoothCamera(orbitControlsRef)

  // 3. 初始实体生成
  useEffect(() => {
    if (!selectedCharacter) return
    resetSpawner()
    elapsedTime.current = 0
    createPlayer(selectedCharacter, 0, 0)
    createNPC('ally_chunyang', 'ally', -2, -2)
    const waveConfig = GAME_CONFIG.WAVES[currentWave as keyof typeof GAME_CONFIG.WAVES] || GAME_CONFIG.WAVES[1]
    for(let i=0; i<GAME_CONFIG.BATTLE.INITIAL_ENEMIES; i++) {
      const spawnPos = { x: (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 20 }
      createNPC(waveConfig.pool[Math.floor(Math.random() * waveConfig.pool.length)], 'enemy', spawnPos.x, spawnPos.z)
    }
    return () => world.clear()
  }, [selectedCharacter, currentWave])

  return (
    <>
      <PerspectiveCamera makeDefault position={GAME_CONFIG.VISUAL.CAMERA_OFFSET} fov={40} />
      <OrbitControls ref={orbitControlsRef} makeDefault enablePan={false} enableZoom={false} enableDamping={true} dampingFactor={0.05} rotateSpeed={0.5} />
      <Stage />
      <Entities />
    </>
  )
}
