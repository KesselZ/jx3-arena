import { PerspectiveCamera, Instances, Instance } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'
import { useFrame } from '@react-three/fiber'

import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC } from '../entities/npc'
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

/**
 * 单个实体的渲染实例
 */
function EntityInstance({ entity, asset, unitDef }: { entity: Entity, asset: any, unitDef: any }) {
  const instanceRef = useRef<any>(null)
  const healthBarRef = useRef<THREE.Mesh>(null) 
  const visualFlip = useRef(entity.facingFlip ? -1 : 1)
  const baseScale = unitDef.scale || 1.0
  const meshHeight = baseScale
  const visualYOffset = (asset.anchorY - 0.5) * meshHeight
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

    if (isDead && timeSinceDeath >= deathDuration) {
      // 视觉自管理：动画演完后，由表现层组件通知逻辑层销毁实体
      world.remove(entity)
      return
    }
    instanceRef.current.visible = true
    instanceRef.current.quaternion.copy(camera.quaternion)

    if (isDead) {
      const p = deathProgress
      const jumpHeight = (p * (1 - p) * 4) * GAME_CONFIG.BATTLE.DEATH_JUMP_HEIGHT 
      const forceX = (entity.deathDir?.x || 0) * p * GAME_CONFIG.BATTLE.DEATH_KNOCKBACK
      const forceZ = (entity.deathDir?.z || 0) * p * GAME_CONFIG.BATTLE.DEATH_KNOCKBACK
      const rotationProgress = Math.min(1, p * 1.6)
      const camRight = _v1.set(1, 0, 0).applyQuaternion(camera.quaternion)
      const dot = (entity.deathDir?.x || 0) * camRight.x + (entity.deathDir?.z || 0) * camRight.z
      const fallSide = dot > 0 ? -1 : 1 
      const fallZ = rotationProgress * Math.PI * 0.5 * fallSide
      const tiltX = -rotationProgress * Math.PI * 0.2 
      _quat.setFromEuler(new THREE.Euler(tiltX, 0, fallZ))
      instanceRef.current.quaternion.multiply(_quat)
      const r = visualYOffset
      const offsetY = Math.cos(fallZ) * r * Math.cos(tiltX)
      instanceRef.current.position.set(entity.position.x + forceX, entity.position.y + offsetY + jumpHeight, entity.position.z + forceZ)
      instanceRef.current.color.setRGB(1, 1 - p, 1 - p)
      if (healthBarRef.current) healthBarRef.current.visible = false
      return 
    }

    const currentSpeed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.z ** 2)
    let bounce = 0, tilt = 0
    if (currentSpeed > 0.1) {
      const t = currentTime * GAME_CONFIG.VISUAL.ANIM_BOUNCE_FREQ * (currentSpeed / 5)
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

    instanceRef.current.position.set(entity.position.x + lungeX, entity.position.y + visualYOffset + bounce, entity.position.z + lungeZ)
    instanceRef.current.quaternion.copy(camera.quaternion)
    if (tilt !== 0) {
      _quat.setFromAxisAngle(_zAxis, tilt)
      instanceRef.current.quaternion.multiply(_quat)
    }

    const isRecentlyAttacking = timeSinceAttack < 0.3 
    if (isRecentlyAttacking || currentSpeed > 0.1) {
      _v1.set(1, 0, 0).applyQuaternion(camera.quaternion)
      const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      camForward.y = 0; camForward.normalize()
      let sideDot = 0, forwardDot = 0
      if (isRecentlyAttacking) {
        const angle = entity.lastAttackAngle || 0
        sideDot = Math.sin(angle) * _v1.x + Math.cos(angle) * _v1.z
        forwardDot = Math.sin(angle) * camForward.x + Math.cos(angle) * camForward.z
      } else {
        sideDot = entity.velocity.x * _v1.x + entity.velocity.z * _v1.z
        forwardDot = entity.velocity.x * camForward.x + entity.velocity.z * camForward.z
      }
      if (isRecentlyAttacking || Math.abs(sideDot) > Math.abs(forwardDot) * 0.5 + 0.1) {
        entity.facingFlip = (unitDef.facing || 'right') === 'right' ? sideDot < 0 : sideDot > 0
      }
    }
    visualFlip.current = THREE.MathUtils.lerp(visualFlip.current, entity.facingFlip ? -1 : 1, 0.25)
    const timeSinceHit = currentTime - (entity.health.lastHitTime || 0)
    let hitScale = 1.0
    if (timeSinceHit < GAME_CONFIG.VISUAL.HIT_FLASH_DURATION) {
      const flashP = 1 - (timeSinceHit / GAME_CONFIG.VISUAL.HIT_FLASH_DURATION)
      instanceRef.current.color.setRGB(1, 1 - flashP, 1 - flashP)
      hitScale = 1 + Math.sin(flashP * Math.PI) * 0.1
    } else {
      instanceRef.current.color.setRGB(1, 1, 1)
    }
    instanceRef.current.scale.set(visualFlip.current * baseScale * hitScale, baseScale * hitScale, 1)

    if (healthBarRef.current) {
      healthBarRef.current.scale.x = Math.max(0, entity.health.current / entity.health.max)
      healthBarRef.current.position.set(entity.position.x, entity.position.y + meshHeight + 0.2, entity.position.z)
      healthBarRef.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <>
      <Instance ref={instanceRef} color="white" />
      <mesh ref={healthBarRef}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color={entity.type === 'enemy' ? '#ff4444' : '#44ff44'} transparent opacity={0.8} />
      </mesh>
    </>
  )
}

/**
 * 兵种渲染组
 */
function UnitTypeGroup({ unitId, entities }: { unitId: string, entities: Entity[] }) {
  const asset = Assets.getTextureSync(unitId)
  const unitDef = UNITS[unitId as keyof typeof UNITS]
  if (!asset || !unitDef) return null
  return (
    <Instances limit={GAME_CONFIG.BATTLE.MAX_INSTANCES_PER_TYPE} castShadow receiveShadow frustumCulled={false}>
      <planeGeometry args={[asset.width / asset.height, 1]} />
      <meshStandardMaterial 
        map={asset.texture} 
        transparent 
        alphaTest={0.5} 
        side={THREE.DoubleSide} 
        onBeforeCompile={(shader) => {
          // 核心修复：在片元着色器中强制法线指向相机
          // 在 Standard 材质中，normal 是视图空间 (View Space) 的法线
          // vec3(0, 0, 1) 在视图空间永远指向相机，这样无论如何翻转，受光面永远是正面
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_begin>',
            `
            #include <normal_fragment_begin>
            normal = vec3(0.0, 0.0, 1.0);
            `
          );
        }}
      />
      {entities.map((entity) => (
        <EntityInstance key={entity.id} entity={entity} asset={asset} unitDef={unitDef} />
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
