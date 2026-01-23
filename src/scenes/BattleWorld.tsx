import { PerspectiveCamera, Instances, Instance } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'

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

  const geometry = useMemo(() => {
    if (!asset) return new THREE.PlaneGeometry(1, 1)
    const geo = new THREE.PlaneGeometry(asset.width / asset.height, 1)
    const offset = 0.5 - asset.anchorY
    geo.translate(0, -offset, 0)
    return geo
  }, [asset?.width, asset?.height, asset?.anchorY])

  useFrame(({ camera }) => {
    if (!meshRef.current || !asset || !unitDef) return
    
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
        const moveIntent = entity.moveIntent || { x: 0, y: 0, z: 0 }
        const intentSpeed = Math.sqrt(moveIntent.x ** 2 + moveIntent.z ** 2)
        
        let bounce = 0, tilt = 0
        if (intentSpeed > 0.1) {
          // 动画频率只参考移动意图，不再受物理阻尼影响
          const t = (currentTime + (entity.animOffset || 0)) * GAME_CONFIG.VISUAL.ANIM_BOUNCE_FREQ
          bounce = Math.abs(Math.sin(t)) * GAME_CONFIG.VISUAL.ANIM_BOUNCE_AMP
          tilt = Math.sin(t) * GAME_CONFIG.VISUAL.ANIM_TILT_AMP
        }

        let lungeX = 0, lungeZ = 0
        const lastActiveAttackTime = Math.max(entity.lastAttackTime || 0, entity.lastBurstTime || 0)
        const timeSinceAttack = currentTime - lastActiveAttackTime
        if (timeSinceAttack < GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION) {
          const p = timeSinceAttack / GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION
          // 视觉冲刺保留，但主要位移已由物理系统接管
          const strength = Math.sin(p * Math.PI) * (GAME_CONFIG.BATTLE.ATTACK_LUNGE_FORCE * 0.5)
          lungeX = Math.sin(entity.lastAttackAngle || 0) * strength
          lungeZ = Math.cos(entity.lastAttackAngle || 0) * strength
        }

        _tempObj.position.set(entity.position.x + lungeX, (entity.position.y || 0) + bounce, entity.position.z + lungeZ)
        
        if (tilt !== 0) {
          _quat.setFromAxisAngle(_zAxis, tilt)
          _tempObj.quaternion.multiply(_quat)
        }

        // 3. 处理朝向 (Facing) - 结合相机视角动态计算
        // 只有当物体有移动倾向时才更新朝向
        if (entity.lastMoveX !== undefined) {
          // 计算移动向量在相机本地坐标系下的投影
          // 我们需要知道移动向量是偏向相机的左边还是右边
          const dotSide = entity.lastMoveX * _camRight.x + entity.lastMoveZ * _camRight.z
          
          if (Math.abs(dotSide) > 0.01) {
            entity.facingFlip = (unitDef.facing || 'right') === 'right' ? dotSide < 0 : dotSide > 0
          }
        }

        // 平滑翻转动画：将中间值存回 entity (使用 delta 确保高刷屏一致性)
        if (entity.visualFlip === undefined) entity.visualFlip = entity.facingFlip ? -1 : 1
        
        const targetFlip = entity.facingFlip ? -1 : 1
        // 将时长转换为速度系数: speed = 4.6 / duration (4.6 是到达 99% 的系数)
        const flipSpeed = 4.6 / Math.max(0.01, GAME_CONFIG.VISUAL.FACING_FLIP_DURATION)
        
        // 使用 exp-lerp 公式: 1 - exp(-speed * dt)
        // 这样无论帧率是多少，在固定时间内趋近目标的比例是相同的
        const lerpFactor = 1 - Math.exp(-flipSpeed * (currentTime - (entity.lastVisualUpdate || currentTime - 0.016)))
        entity.visualFlip = THREE.MathUtils.lerp(entity.visualFlip, targetFlip, Math.min(1, lerpFactor))
        entity.lastVisualUpdate = currentTime
        
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
      _v1.set(vFlip * baseScale * hitScale, baseScale * hitScale, 1) // Reuse _v1 as scale
      
      // 使用 compose 替代 updateMatrix，性能更高且更直接
      _tempObj.matrix.compose(_tempObj.position, _tempObj.quaternion, _v1)
      
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
      meshRef.current.setColorAt(i, _tempColor)
    }

    // 6. 核心优化：利用 mesh.count 限制渲染范围，不再每帧全量遍历空实例
    meshRef.current.count = entities.length
    
    // 只有当实体数量减少时，才需要把多余的实例“藏起来”，防止下次 count 增加时闪现
    // 这里可以做一个简单的阈值记录，或者在实体移除时处理，目前先保持 count 限制
    
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

  const dofRef = useRef<any>(null)

  useFrame((state) => {
    if (!dofRef.current) return
    
    // 1. 找到主角
    const player = world.entities.find(e => e.id === 'player-main')
    if (!player) return

    // 2. 计算相机到主角目标的距离 (对齐 TPSCamera 的 1.2m 头部偏移)
    const distance = state.camera.position.distanceTo(_v1.set(player.position.x, (player.position.y || 0) + 1.2, player.position.z))
    
    // 3. 将物理距离转换为 0-1 的 focusDistance
    // 关键修正：PerspectiveCamera 的深度是非线性的
    // 公式参考：(far / (far - near)) * (1.0 - (near / distance))
    const far = state.camera.far;
    const near = state.camera.near;
    const targetFocus = (far / (far - near)) * (1.0 - (near / distance));
    
    // 4. 直接更新 uniform
    if (dofRef.current.circleOfConfusionMaterial) {
      dofRef.current.circleOfConfusionMaterial.uniforms.focusDistance.value = THREE.MathUtils.lerp(
        dofRef.current.circleOfConfusionMaterial.uniforms.focusDistance.value,
        targetFocus,
        0.1
      )
    }
  })

  useEffect(() => {
    if (!selectedCharacter) return
    const initGame = async () => {
      await Assets.preloadAll();
      resetSpawner()
      world.clear() 
      createPlayer(selectedCharacter, 0, 0)
      
      // --- 修改：增加 100 个友军站在主角旁边 ---
      for (let i = 0; i < 100; i++) {
        // 在主角周围随机分布，半径 2-8 米
        const angle = Math.random() * Math.PI * 2
        const radius = 2 + Math.random() * 6
        const ax = Math.cos(angle) * radius
        const az = Math.sin(angle) * radius
        createNPC('ally_chunyang', 'ally', ax, az)
      }

      const waveConfig = GAME_CONFIG.WAVES[currentWave as keyof typeof GAME_CONFIG.WAVES] || GAME_CONFIG.WAVES[1]
      for(let i=0; i<GAME_CONFIG.BATTLE.INITIAL_ENEMIES; i++) {
        const spawnPos = { x: (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 20 }
        createNPC(waveConfig.pool[Math.floor(Math.random() * waveConfig.pool.length)], 'enemy', spawnPos.x, spawnPos.z)
      }

      // --- 新增：初始化观众 (基于 ARENA 统一配置) ---
      GAME_CONFIG.ARENA.STANDS.forEach(stand => {
        for (let i = 0; i < 20; i++) {
          const rx = (Math.random() - 0.5) * stand.size[0] + stand.center[0]
          const rz = (Math.random() - 0.5) * stand.size[2] + stand.center[2] // 修正：center[2] 才是 Z 轴坐标
          const level = Math.floor(Math.random() * GAME_CONFIG.ARENA.LEVEL_COUNT)
          const ry = GAME_CONFIG.ARENA.BASE_Y + (level * GAME_CONFIG.ARENA.LEVEL_HEIGHT) + 1.5 
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

      {/* 后期处理效果 */}
      <EffectComposer disableNormalPass>
        <Bloom 
          intensity={1.5}          // 提高强度，让火炬更亮
          luminanceThreshold={1.0} // 极大提高阈值，防止地面泛白
          luminanceSmoothing={0.05} 
          mipmapBlur               
        />
        {/* 暂时关闭景深效果
        <DepthOfField 
          ref={dofRef}
          focusDistance={0.025}    
          focalLength={0.01}       
          bokehScale={1.0}         
        /> 
        */}
      </EffectComposer>
    </>
  )
}
