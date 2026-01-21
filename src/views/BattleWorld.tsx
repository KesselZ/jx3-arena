import { useFrame, useThree } from '@react-three/fiber'
import { Instances, Instance, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'

import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC } from '../entities/npc'
import { world } from '../game/world'
import { useKeyboard } from '../hooks/useKeyboard'
import { resetSpawner } from '../systems/spawnSystem'
import { GAME_CONFIG } from '../game/config'
import { Assets, UNITS } from '../assets/assets'
import { Stage } from '../components/Stage'
import { useSmoothCamera } from '../hooks/useSmoothCamera'
import { useBattleSystems } from '../hooks/useBattleSystems'

/**
 * 按兵种合批的渲染器 (进阶版：零子组件开销)
 * 职责：
 * 1. 负责 1 个兵种的 1 个 Draw Call。
 * 2. 内部直接用 for 循环更新矩阵，完全跳过 React 对单个实体的调度。
 */
function UnitTypeGroup({ unitId, entities }: { unitId: string, entities: any[] }) {
  const [asset, setAsset] = useState<any>(null)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  
  // 1. 核心优化：预分配临时对象，彻底消除每秒 60 帧的对象创建压力
  const _matrix = useMemo(() => new THREE.Matrix4(), [])
  const _pos = useMemo(() => new THREE.Vector3(), [])
  const _scale = useMemo(() => new THREE.Vector3(), [])
  const _quat = useMemo(() => new THREE.Quaternion(), [])
  const _color = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    console.log(`[Asset] 开始加载兵种纹理: ${unitId}`);
    Assets.getTexture(unitId as any).then((data) => {
      console.log(`[Asset] 兵种纹理加载成功: ${unitId}`, data);
      setAsset(data);
    });
  }, [unitId])

  useFrame(({ camera }) => {
    if (!meshRef.current || !asset || entities.length === 0) return

    // 2. 关键修复：显式同步渲染数量，确保 GPU 知道该画多少个
    meshRef.current.count = entities.length

    const unitDef = UNITS[unitId as keyof typeof UNITS]
    const baseScale = (unitDef as any).scale || 1.0
    const defaultFacing = (unitDef as any).facing || 'right'
    const meshHeight = baseScale
    const visualYOffset = (asset.anchorY - 0.5) * meshHeight

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      
      // 3. 复用预分配对象进行同步，避免内存抖动
      _pos.set(entity.position.x, entity.position.y + visualYOffset, entity.position.z)
      _quat.copy(camera.quaternion)

      let shouldFlip = false
      if (entity.velocity.x !== 0) {
        shouldFlip = defaultFacing === 'right' ? entity.velocity.x < 0 : entity.velocity.x > 0
      }
      const scaleX = shouldFlip ? -baseScale : baseScale
      _scale.set(scaleX, baseScale, 1)

      _matrix.compose(_pos, _quat, _scale)
      meshRef.current.setMatrixAt(i, _matrix)

      // 4. 受击颜色快速反馈
      const isHit = performance.now() / 1000 - (entity.health.lastHitTime || 0) < 0.1
      _color.set(isHit ? '#ff0000' : '#ffffff')
      meshRef.current.setColorAt(i, _color)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  if (!asset) return null

  const aspectRatio = asset.width / asset.height

  return (
    <instancedMesh 
      ref={meshRef} 
      args={[undefined, undefined, 1000]} 
      castShadow 
      receiveShadow
      frustumCulled={false} // 关键：禁用视锥体剔除，防止由于包围盒计算不准导致的角色消失
    >
      <planeGeometry args={[aspectRatio, 1]} />
      <meshBasicMaterial 
        map={asset.texture} 
        transparent 
        alphaTest={0.5} 
        side={THREE.DoubleSide} 
      />
    </instancedMesh>
  )
}

/**
 * 实体渲染管理器 - 混合架构
 */
function Entities() {
  const allEntities = useEntities(world)
  
  const groups = useMemo(() => {
    const map: Record<string, any[]> = {}
    const entityArray = [...allEntities]
    entityArray.forEach(e => {
      if (!map[e.unitId]) map[e.unitId] = []
      map[e.unitId].push(e)
    })
    return map
  }, [allEntities])

  return (
    <>
      {Object.entries(groups).map(([unitId, entities]) => (
        <UnitTypeGroup key={unitId} unitId={unitId} entities={entities} />
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

  // 1. 运行核心逻辑系统 (驱动所有实体位移、AI)
  const { elapsedTime } = useBattleSystems(keys, currentWave)

  // 2. 运行相机控制器
  useSmoothCamera(orbitControlsRef)

  // 3. 场景初始化逻辑
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
