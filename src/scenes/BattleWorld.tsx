import { PerspectiveCamera, Instances, Instance } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'
import { useFrame } from '@react-three/fiber'

import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC, createSpectator } from '../entities/npc'
import { world, queries } from '../engine/ecs'
import { useKeyboard } from '../hooks/useKeyboard'
import { resetSpawner } from '../systems/spawnSystem'
import { GAME_CONFIG } from '../game/config'
import { Assets } from '../assets/assets'
import { UNITS } from '../data/units'
import { Stage } from './Stage'
import { CameraSystem } from '../engine/camera/CameraSystem'
import { useBattleSystems } from '../hooks/useBattleSystems'
import { VFXManager } from '../vfx/VFXManager'
import { Entity } from '../engine/ecs'

// --- 性能优化：在全局定义缓存对象，供所有 UnitTypeGroup 共享 ---
const _v1 = new THREE.Vector3()
const _v2 = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _zAxis = new THREE.Vector3(0, 0, 1)
const _camForward = new THREE.Vector3()
const _camRight = new THREE.Vector3()
const _euler = new THREE.Euler()
const _tempObj = new THREE.Object3D()
const _tempColor = new THREE.Color()

/**
 * 兵种渲染组：全面拥抱 ECS 渲染架构
 * 不再为每个实体创建 React 组件，而是由一个 useFrame 统一更新所有 Instance 矩阵
 */
function UnitTypeGroup({ unitId, entities }: { unitId: string, entities: Entity[] }) {
  const asset = Assets.getTextureSync(unitId)
  const unitDef = UNITS[unitId as keyof typeof UNITS]
  const meshRef = useRef<any>(null)

  if (!asset || !unitDef) return null

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(asset.width / asset.height, 1)
    const offset = 0.5 - asset.anchorY
    geo.translate(0, -offset, 0)
    return geo
  }, [asset.width, asset.height, asset.anchorY])

  useFrame(({ camera }) => {
    if (!meshRef.current) return

    const currentTime = performance.now() / 1000
    const deathDuration = GAME_CONFIG.BATTLE.DEATH_DURATION
    const baseScale = unitDef.scale || 1.0

    // 缓存相机数据，避免在循环中重复计算
    _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
    _camForward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    _camForward.y = 0
    _camForward.normalize()

    // 遍历所有实体进行“命令式”渲染更新
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      
      const isDead = !!entity.dead
      const timeSinceDeath = isDead ? currentTime - (entity.deathTime || 0) : 0
      
      // 1. 处理死亡逻辑：如果是彻底死亡并过期的实体，交给 world 处理，渲染层跳过
      if (isDead && timeSinceDeath >= deathDuration) {
        world.remove(entity)
        continue
      }

      // 2. 计算位置 (Position) 和 颜色 (Color)
      _tempObj.quaternion.copy(camera.quaternion)
      _tempColor.setRGB(1, 1, 1) // 每一帧开始前重置为纯白，确保颜色不污染
      let hitScale = 1.0

      if (isDead) {
        // 死亡动画逻辑
        const p = Math.min(1, timeSinceDeath / deathDuration)
        const jumpHeight = (p * (1 - p) * 4) * GAME_CONFIG.BATTLE.DEATH_JUMP_HEIGHT 
        const forceX = (entity.deathDir?.x || 0) * p * GAME_CONFIG.BATTLE.DEATH_KNOCKBACK
        const forceZ = (entity.deathDir?.z || 0) * p * GAME_CONFIG.BATTLE.DEATH_KNOCKBACK
        
        const rotationProgress = Math.min(1, p * 1.6)
        const dot = (entity.deathDir?.x || 0) * _camRight.x + (entity.deathDir?.z || 0) * _camRight.z
        const fallSide = dot > 0 ? -1 : 1 
        const fallZ = rotationProgress * Math.PI * 0.5 * fallSide
        const tiltX = -rotationProgress * Math.PI * 0.2 
        
        _euler.set(tiltX, 0, fallZ)
        _quat.setFromEuler(_euler)
        _tempObj.quaternion.multiply(_quat)
        
        const r = baseScale * 0.5 
        const offsetY = Math.cos(fallZ) * r * Math.cos(tiltX)
        _tempObj.position.set(entity.position.x + forceX, entity.position.y + offsetY + jumpHeight, entity.position.z + forceZ)
        _tempColor.setRGB(1, 1 - p, 1 - p)
      } else {
        // 生存动画逻辑 (移动跳动、攻击冲刺等)
        const velocity = entity.velocity || { x: 0, y: 0, z: 0 }
        const currentSpeed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2)
        let bounce = 0, tilt = 0
        if (currentSpeed > 0.1) {
          const t = (currentTime + (entity.animOffset || 0)) * GAME_CONFIG.VISUAL.ANIM_BOUNCE_FREQ * (currentSpeed / 5)
          bounce = Math.abs(Math.sin(t)) * GAME_CONFIG.VISUAL.ANIM_BOUNCE_AMP
          tilt = Math.sin(t) * GAME_CONFIG.VISUAL.ANIM_TILT_AMP
        }

        let lungeX = 0, lungeZ = 0
        const lastActiveAttackTime = Math.max(entity.lastAttackTime || 0, entity.lastBurstTime || 0)
        const timeSinceAttack = currentTime - lastActiveAttackTime
        if (timeSinceAttack < GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION) {
          const p = timeSinceAttack / GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION
          const strength = Math.sin(p * Math.PI) * GAME_CONFIG.BATTLE.ATTACK_LUNGE_FORCE 
          lungeX = Math.sin(entity.lastAttackAngle || 0) * strength
          lungeZ = Math.cos(entity.lastAttackAngle || 0) * strength
        }

        _tempObj.position.set(entity.position.x + lungeX, (entity.position.y || 0) + bounce, entity.position.z + lungeZ)
        
        if (tilt !== 0) {
          _quat.setFromAxisAngle(_zAxis, tilt)
          _tempObj.quaternion.multiply(_quat)
        }

        // 3. 处理朝向 (Facing)
        const isRecentlyAttacking = timeSinceAttack < 0.3 
        if (entity.velocity && (isRecentlyAttacking || currentSpeed > 0.1)) {
          let sideDot = 0, forwardDot = 0
          if (isRecentlyAttacking) {
            const angle = entity.lastAttackAngle || 0
            const s = Math.sin(angle), c = Math.cos(angle)
            sideDot = s * _camRight.x + c * _camRight.z
            forwardDot = s * _camForward.x + c * _camForward.z
          } else {
            sideDot = entity.velocity.x * _camRight.x + entity.velocity.z * _camRight.z
            forwardDot = entity.velocity.x * _camForward.x + entity.velocity.z * _camForward.z
          }
          if (isRecentlyAttacking || Math.abs(sideDot) > Math.abs(forwardDot) * 0.5 + 0.1) {
            entity.facingFlip = (unitDef.facing || 'right') === 'right' ? sideDot < 0 : sideDot > 0
          }
        }

        // 平滑翻转动画：将中间值存回 entity
        if (entity.visualFlip === undefined) entity.visualFlip = entity.facingFlip ? -1 : 1
        entity.visualFlip = THREE.MathUtils.lerp(entity.visualFlip, entity.facingFlip ? -1 : 1, 0.25)

        // 4. 处理受击效果 (Hit Flash)
        const timeSinceHit = entity.health ? currentTime - (entity.health.lastHitTime || 0) : 999
        if (entity.health && timeSinceHit < GAME_CONFIG.VISUAL.HIT_FLASH_DURATION) {
          const flashP = 1 - (timeSinceHit / GAME_CONFIG.VISUAL.HIT_FLASH_DURATION)
          _tempColor.setRGB(1, 1 - flashP, 1 - flashP)
          hitScale = 1 + Math.sin(flashP * Math.PI) * 0.1
        }
      }

      // 5. 应用最终矩阵和颜色
      const vFlip = entity.visualFlip ?? (entity.facingFlip ? -1 : 1)
      _tempObj.scale.set(vFlip * baseScale * hitScale, baseScale * hitScale, 1)
      _tempObj.updateMatrix()
      
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
      meshRef.current.setColorAt(i, _tempColor)
    }

    // 填充剩余的实例，将它们移到视口外或缩放为 0
    for (let i = entities.length; i < GAME_CONFIG.BATTLE.MAX_INSTANCES_PER_TYPE; i++) {
      _tempObj.position.set(0, -1000, 0)
      _tempObj.scale.set(0, 0, 0)
      _tempObj.updateMatrix()
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
    }

    // 核心：告诉 Three.js 这一帧数据更新了
    meshRef.current.count = entities.length
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <Instances 
      ref={meshRef}
      limit={GAME_CONFIG.BATTLE.MAX_INSTANCES_PER_TYPE} 
      castShadow 
      receiveShadow 
      frustumCulled={false}
      geometry={geometry}
    >
      <meshStandardMaterial 
        map={asset.texture} 
        emissiveMap={asset.texture}
        emissive={new THREE.Color(0xffffff)}
        emissiveIntensity={0.8}
        color={new THREE.Color(0x444444)}
        transparent 
        alphaTest={0.5} 
        side={THREE.DoubleSide} 
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_begin>',
            `
            #include <normal_fragment_begin>
            normal = vec3(0.0, 0.0, 1.0);
            `
          );
        }}
      />
    </Instances>
  )
}

/**
 * 实体渲染管理器
 */
function Entities() {
  const allEntities = useEntities(world)
  const groups = useMemo(() => {
    const map: Record<string, any[]> = {}
    world.entities.forEach(e => {
      if (e.unitId) {
        if (!map[e.unitId]) map[e.unitId] = []
        map[e.unitId].push(e)
      }
    })
    return map
  }, [allEntities.entities.length]) 

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

  useBattleSystems(keys, currentWave)

  useEffect(() => {
    if (!selectedCharacter) return
    const initGame = async () => {
      await Assets.preloadAll();
      resetSpawner()
      world.clear() 
      createPlayer(selectedCharacter, 0, 0)
      createNPC('ally_chunyang', 'ally', -2, -2)
      const waveConfig = GAME_CONFIG.WAVES[currentWave as keyof typeof GAME_CONFIG.WAVES] || GAME_CONFIG.WAVES[1]
      for(let i=0; i<GAME_CONFIG.BATTLE.INITIAL_ENEMIES; i++) {
        const spawnPos = { x: (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 20 }
        createNPC(waveConfig.pool[Math.floor(Math.random() * waveConfig.pool.length)], 'enemy', spawnPos.x, spawnPos.z)
      }

      // --- 新增：初始化观众 ---
      const { x: bx, z: bz } = GAME_CONFIG.BATTLE.SCREEN_BOUNDS
      const standConfigs = [
        { center: [0, bz + 75], range: [bx * 2 + 100, 50] }, 
        { center: [0, -bz - 75], range: [bx * 2 + 100, 50] }, 
        { center: [bx + 75, 0], range: [50, bz * 2 + 100] }, 
        { center: [-bx - 75, 0], range: [50, bz * 2 + 100] }, 
      ]

      standConfigs.forEach(stand => {
        for (let i = 0; i < 20; i++) {
          const rx = (Math.random() - 0.5) * stand.range[0] + stand.center[0]
          const rz = (Math.random() - 0.5) * stand.range[1] + stand.center[1]
          const level = Math.floor(Math.random() * 8)
          const ry = -2 + (level * 3) + 1.5 
          createSpectator('bandit', rx, ry, rz)
        }
      })
    };
    initGame();
    return () => world.clear()
  }, [selectedCharacter, currentWave])

  return (
    <>
      <PerspectiveCamera makeDefault fov={40} near={0.1} far={1000} />
      <CameraSystem />
      <Stage />
      <Entities />
      <VFXManager />
    </>
  )
}
