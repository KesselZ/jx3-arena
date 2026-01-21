import { useFrame, useThree } from '@react-three/fiber'
import { Instances, Instance, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'

import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC } from '../entities/npc'
import { world, queries } from '../game/world'
import { useKeyboard } from '../hooks/useKeyboard'
import { resetSpawner } from '../systems/spawnSystem'
import { GAME_CONFIG } from '../game/config'
import { Assets } from '../assets/assets'
import { UNITS, UnitConfig } from '../data/units'
import { Stage } from '../components/Stage'
import { useSmoothCamera } from '../hooks/useSmoothCamera'
import { useBattleSystems } from '../hooks/useBattleSystems'
import { MeleeSlash, ArrowTracer } from '../components/VFXLibrary' // 新增
import { Entity } from '../game/world'

/**
 * 视觉特效分发器
 * 职责：使用 Miniplex 的 Archetype 查询，实现高效的局部渲染
 */
function VisualEffects() {
  const { entities } = useEntities(queries.effects)

  return (
    <>
      {entities.map(entity => {
        if (entity.effect?.type === 'slash') return <MeleeSlash key={entity.id} entity={entity} />
        if (entity.effect?.type === 'arrow') return <ArrowTracer key={entity.id} entity={entity} />
        return null
      })}
    </>
  )
}

/**
 * 单个实体的渲染实例 (声明式组件)
 * 职责：负责处理自己的动画、翻转、颜色同步
 * 优点：高度解耦，易于扩展（如添加血条子组件）
 */
function EntityInstance({ entity, asset, unitDef }: { entity: Entity, asset: any, unitDef: UnitConfig }) {
  const instanceRef = useRef<any>(null)
  const healthBarRef = useRef<THREE.Mesh>(null) 
  
  // 新增：用于平滑翻转的内部状态 (1 为右，-1 为左)
  const visualFlip = useRef(entity.facingFlip ? -1 : 1)
  
  const baseScale = unitDef.scale || 1.0
  const defaultFacing = unitDef.facing || 'right'
  const meshHeight = baseScale
  const visualYOffset = (asset.anchorY - 0.5) * meshHeight

  // 缓存复用对象，确保 60FPS 下无垃圾回收压力
  const _v1 = useMemo(() => new THREE.Vector3(), [])
  const _quat = useMemo(() => new THREE.Quaternion(), [])
  const _zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])

  useFrame(({ camera }) => {
    if (!instanceRef.current) return

    const currentTime = performance.now() / 1000
    const isDead = !!entity.dead
    const timeSinceDeath = isDead ? currentTime - (entity.deathTime || 0) : 0
    const deathDuration = GAME_CONFIG.BATTLE.DEATH_DURATION
    const deathProgress = Math.min(1, timeSinceDeath / deathDuration)

    // 1. 彻底死亡后的清理
    if (isDead && timeSinceDeath >= deathDuration) {
      instanceRef.current.visible = false
      if (healthBarRef.current) healthBarRef.current.visible = false
      return
    }

    instanceRef.current.visible = true

    // 2. 基础位姿：看板 (始终面对相机)
    instanceRef.current.quaternion.copy(camera.quaternion)

    if (isDead) {
      // --- 核心重构：街机风格爆发式死亡动画 ---
      const p = deathProgress
      
      // 1. 爆发式弹跳
      const jumpHeight = (p * (1 - p) * 4) * GAME_CONFIG.BATTLE.DEATH_JUMP_HEIGHT 
      
      // 2. 强力击退位移
      const forceX = (entity.deathDir?.x || 0) * p * GAME_CONFIG.BATTLE.DEATH_KNOCKBACK
      const forceZ = (entity.deathDir?.z || 0) * p * GAME_CONFIG.BATTLE.DEATH_KNOCKBACK

      // 3. 极速翻转：在前 60% 的时间内完成 90 度倒下
      const rotationProgress = Math.min(1, p * 1.6)
      
      const camRight = _v1.set(1, 0, 0).applyQuaternion(camera.quaternion)
      const dot = (entity.deathDir?.x || 0) * camRight.x + (entity.deathDir?.z || 0) * camRight.z
      const fallSide = dot > 0 ? -1 : 1 
      
      const fallZ = rotationProgress * Math.PI * 0.5 * fallSide
      const tiltX = -rotationProgress * Math.PI * 0.2 // 略微后仰
      
      _quat.setFromEuler(new THREE.Euler(tiltX, 0, fallZ))
      instanceRef.current.quaternion.multiply(_quat)

      // 支点高度补偿 (随着旋转进度动态调整)
      const r = visualYOffset
      const offsetY = Math.cos(fallZ) * r * Math.cos(tiltX)

      instanceRef.current.position.set(
        entity.position.x + forceX,
        entity.position.y + offsetY + jumpHeight,
        entity.position.z + forceZ
      )
      
      // 4. 快速淡出
      const opacity = 1 - Math.pow(p, 3) // 指数级消散
      instanceRef.current.color.setRGB(1, 1 - p, 1 - p)
      
      if (healthBarRef.current) healthBarRef.current.visible = false
      return 
    }

    instanceRef.current.rotation.z = 0 // 重置旋转

    // 3. 正常存活时的动画节奏同步
    const currentSpeed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.z ** 2)
    let bounce = 0
    let tilt = 0
    if (currentSpeed > 0.1) {
      // 动画频率与实际速度挂钩，基础速度 5 为基准
      const t = currentTime * GAME_CONFIG.VISUAL.ANIM_BOUNCE_FREQ * (currentSpeed / 5)
      bounce = Math.abs(Math.sin(t)) * GAME_CONFIG.VISUAL.ANIM_BOUNCE_AMP
      tilt = Math.sin(t) * GAME_CONFIG.VISUAL.ANIM_TILT_AMP
    }

    // 3. 变换同步 (包含行走动画与攻击冲刺)
    
    // --- 计算攻击冲刺 (Attack Lunge) ---
    let lungeX = 0, lungeZ = 0
    const attackTime = entity.lastAttackTime || 0
    const burstTime = entity.lastBurstTime || 0
    // 取最近的一次攻击触发时间 (普攻或连发)
    const lastActiveAttackTime = Math.max(attackTime, burstTime)
    const timeSinceAttack = currentTime - lastActiveAttackTime
    const lungeDuration = GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION 

    if (timeSinceAttack < lungeDuration) {
      const p = timeSinceAttack / lungeDuration
      // 冲刺曲线：快速向前，缓慢回弹
      const strength = Math.sin(p * Math.PI) * GAME_CONFIG.BATTLE.ATTACK_LUNGE_FORCE 
      const angle = entity.lastAttackAngle || 0
      lungeX = Math.sin(angle) * strength
      lungeZ = Math.cos(angle) * strength
    }

    instanceRef.current.position.set(
      entity.position.x + lungeX,
      entity.position.y + visualYOffset + bounce,
      entity.position.z + lungeZ
    )

    // 4. 看板旋转与倾斜
    instanceRef.current.quaternion.copy(camera.quaternion)
    if (tilt !== 0) {
      _quat.setFromAxisAngle(_zAxis, tilt)
      instanceRef.current.quaternion.multiply(_quat)
    }

    // 5. 相机相对翻转逻辑 (带状态记忆 + 攻击优先 + 稳定性优化)
    const isRecentlyAttacking = timeSinceAttack < 0.3 
    
    if (isRecentlyAttacking || currentSpeed > 0.1) {
      _v1.set(1, 0, 0).applyQuaternion(camera.quaternion) // 相机右向量
      
      // 获取相机平面的前方向向量
      const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      camForward.y = 0
      camForward.normalize()

      let sideDot = 0
      let forwardDot = 0

      if (isRecentlyAttacking) {
        const angle = entity.lastAttackAngle || 0
        const attackDirX = Math.sin(angle)
        const attackDirZ = Math.cos(angle)
        sideDot = attackDirX * _v1.x + attackDirZ * _v1.z
        forwardDot = attackDirX * camForward.x + attackDirZ * camForward.z
      } else {
        sideDot = entity.velocity.x * _v1.x + entity.velocity.z * _v1.z
        forwardDot = entity.velocity.x * camForward.x + entity.velocity.z * camForward.z
      }

      // --- 核心优化：稳定性逻辑 ---
      // 1. 如果是攻击，由于动作幅度大，直接允许转向
      // 2. 如果是移动，只有当“侧向分量”明显超过“纵向分量”的 0.5 倍时，才认为玩家想转身
      // 这能有效防止 W/S 移动或相机旋转时导致的误触翻转
      const isIntentionalSideMove = Math.abs(sideDot) > Math.abs(forwardDot) * 0.5 + 0.1
      
      if (isRecentlyAttacking || isIntentionalSideMove) {
        const isTargetingRight = sideDot > 0
        entity.facingFlip = defaultFacing === 'right' ? !isTargetingRight : isTargetingRight
      }
    }
    
    // 渲染时更新平滑翻转插值
    const targetFlip = entity.facingFlip ? -1 : 1
    // 使用 lerp 实现平滑的“卡片翻转”效果，0.25 是兼顾速度与丝滑度的黄金值
    visualFlip.current = THREE.MathUtils.lerp(visualFlip.current, targetFlip, 0.25)
    
    const finalScaleX = visualFlip.current * baseScale
    
    // 6. 受击视觉反馈 (带平滑淡出和微抖动)
    const timeSinceHit = currentTime - (entity.health.lastHitTime || 0)
    const hitDuration = GAME_CONFIG.VISUAL.HIT_FLASH_DURATION
    let hitScale = 1.0

    if (timeSinceHit < hitDuration) {
      const flashP = 1 - (timeSinceHit / hitDuration)
      // 颜色：从红 (1, 0, 0) 平滑过渡回白 (1, 1, 1)
      instanceRef.current.color.setRGB(1, 1 - flashP, 1 - flashP)
      // 抖动：受击瞬间轻微放大
      hitScale = 1 + Math.sin(flashP * Math.PI) * 0.1
    } else {
      instanceRef.current.color.setRGB(1, 1, 1)
    }

    instanceRef.current.scale.set(finalScaleX * hitScale, baseScale * hitScale, 1)

    // 7. 血条同步
    if (healthBarRef.current) {
      const healthPercent = Math.max(0, entity.health.current / entity.health.max)
      healthBarRef.current.scale.x = healthPercent
      healthBarRef.current.position.set(
        entity.position.x,
        entity.position.y + meshHeight + 0.2,
        entity.position.z
      )
      healthBarRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <>
      <Instance ref={instanceRef} color="white" />
      {/* 简单的血条显示 */}
      <mesh ref={healthBarRef}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color={entity.type === 'enemy' ? '#ff4444' : '#44ff44'} transparent opacity={0.8} />
      </mesh>
    </>
  )
}

/**
 * 兵种渲染组 (基于 drei 的 Instances 封装)
 * 职责：管理该兵种的所有实例，提供共享的材质和几何体
 */
function UnitTypeGroup({ unitId, entities }: { unitId: string, entities: Entity[] }) {
  const asset = Assets.getTextureSync(unitId)
  const unitDef = UNITS[unitId]
  
  if (!asset || !unitDef) return null

  const aspectRatio = asset.width / asset.height

  return (
    <Instances 
      limit={GAME_CONFIG.BATTLE.MAX_INSTANCES_PER_TYPE} 
      castShadow 
      receiveShadow
      frustumCulled={false}
    >
      <planeGeometry args={[aspectRatio, 1]} />
      <meshStandardMaterial 
        map={asset.texture} 
        transparent 
        alphaTest={0.5} 
        side={THREE.DoubleSide} 
        onBeforeCompile={(shader) => {
          // 核心光效：锁定世界空间法线朝向，确保护航看板在旋转时打光稳定
          shader.vertexShader = shader.vertexShader.replace(
            '#include <fog_vertex>',
            `#include <fog_vertex>
             vNormal = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);`
          );
        }}
      />
      {entities.map((entity) => (
        <EntityInstance 
          key={entity.id} 
          entity={entity} 
          asset={asset} 
          unitDef={unitDef} 
        />
      ))}
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
    const entityArray = [...world.entities]
    entityArray.forEach(e => {
      const uid = e.unitId
      if (!uid) return
      if (!map[uid]) map[uid] = []
      map[uid].push(e)
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
  const orbitControlsRef = useRef<any>(null)

  useBattleSystems(keys, currentWave)
  useSmoothCamera(orbitControlsRef)

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
    };

    initGame();
    return () => world.clear()
  }, [selectedCharacter, currentWave])

  return (
    <>
      <PerspectiveCamera makeDefault position={GAME_CONFIG.VISUAL.CAMERA_OFFSET} fov={40} />
      <OrbitControls 
        ref={orbitControlsRef} 
        makeDefault 
        enablePan={false} 
        enableZoom={false} 
        enableDamping={true} 
        dampingFactor={0.05} 
        rotateSpeed={0.5} 
        minPolarAngle={GAME_CONFIG.VISUAL.CAMERA_MIN_POLAR}
        maxPolarAngle={GAME_CONFIG.VISUAL.CAMERA_MAX_POLAR}
      />
      <Stage />
      <Entities />
      <VisualEffects />
    </>
  )
}
