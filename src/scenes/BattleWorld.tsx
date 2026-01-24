import { PerspectiveCamera, Instances, Instance } from '@react-three/drei'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useEntities } from 'miniplex-react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'

import { useGameStore } from '../store/useGameStore'
import { createPlayer } from '../entities/player'
import { createNPC, createSpectator } from '../entities/npc'
import { world, queries } from '../engine/ecs'
import { useKeyboard } from '../hooks/useKeyboard'
import { resetSpawner } from '../systems/spawnSystem'
import { GAME_CONFIG } from '../data/config'
import { Assets } from '../assets/assets'
import { UNITS } from '../data/units'
import { Stage } from './Stage'
import { CameraSystem } from '../engine/camera/CameraSystem'
import { useBattleSystems } from '../hooks/useBattleSystems'
import { VFXManager } from '../vfx/VFXManager'
import { Entity } from '../engine/ecs'
import { AudioAssets } from '../assets/audioAssets'

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

  useFrame(({ camera, clock }) => {
    if (!meshRef.current || !asset || !unitDef) return
    
    const isPaused = useGameStore.getState().isPaused
    // 暂停时，我们依然需要让 Instance 保持在最后的位置，所以不能直接 return
    // 我们只在非暂停状态下更新逻辑时间，暂停时 currentTime 保持不变
    
    const currentTime = isPaused 
      ? (meshRef.current._lastTime || performance.now() / 1000)
      : performance.now() / 1000
    
    meshRef.current._lastTime = currentTime
    
    const deathDuration = GAME_CONFIG.BATTLE.DEATH_DURATION
    const baseScale = unitDef.scale || 1.0

    // --- 性能优化：分帧更新 (Time Slicing) ---
    // 对于观众(spectator)，我们不需要每帧都更新矩阵。
    // 这里设置一个超参数，例如每 5 帧更新一次
    const UPDATE_INTERVAL = 5 
    const frameCount = Math.floor(clock.getElapsedTime() * 60) // 估算帧数
    
    // 缓存相机数据
    _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
    _camForward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    _camForward.y = 0
    _camForward.normalize()

    // 遍历所有实体进行更新
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      if (!entity) continue
      
      const isSpectator = entity.type === 'spectator'
      
      // 核心逻辑：如果是观众，且没到更新帧，则跳过复杂的矩阵计算
      // 利用 entity.id 的哈希值打破同步，让不同观众在不同帧更新，平摊 CPU 压力
      if (isSpectator) {
        const entityHash = parseInt(entity.id.slice(0, 8), 16) || 0
        if ((frameCount + entityHash) % UPDATE_INTERVAL !== 0) {
          continue 
        }
      }
      
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
      let squash = 0 // 初始化 squash 变量，确保在所有分支中都可用

      // 如果还在出生预警期间，将缩放设为 0 (隐藏模型)，并跳过动画逻辑
      if (entity.spawnTimer !== undefined && entity.spawnTimer > 0) {
        hitScale = 0
      } else if (isDead) {
        // 1. 死亡动画逻辑
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
        
        // 死亡颜色：更浓郁的暗红染色
        _tempColor.setRGB(0.6, 0.1, 0.1)
      } else {
        // 2. 生存动画逻辑
        const moveIntent = entity.moveIntent || { x: 0, y: 0, z: 0 }
        const intentSpeed = Math.sqrt(moveIntent.x ** 2 + moveIntent.z ** 2)
        
        let bounce = 0, tilt = 0
        const tBase = (currentTime + (entity.animOffset || 0))
        
        if (intentSpeed > 0.1) {
          // 移动动画：频率随速度动态调整
          const speedFactor = 1 + (intentSpeed - GAME_CONFIG.BATTLE.PLAYER_INITIAL_SPEED) * 0.1
          const freq = GAME_CONFIG.VISUAL.ANIM_BOUNCE_FREQ * Math.max(0.5, speedFactor)
          
          const t = tBase * freq
          const sinT = Math.sin(t)
          const absSinT = Math.abs(sinT)
          
          // --- 进化 1: 非线性弹跳 ---
          // 使用 pow(x, 1.5) 让落地更清脆，产生“蹬地”感
          bounce = Math.pow(absSinT, 1.5) * GAME_CONFIG.VISUAL.ANIM_BOUNCE_AMP
          
          // --- 进化 2: 减弱摇摆 ---
          tilt = sinT * GAME_CONFIG.VISUAL.ANIM_TILT_AMP
          
          // --- 进化 3: 动量对齐的挤压拉伸 ---
          // 使用 cos 产生与 abs(sin) 错相的效果：落地(t=0, cos=1)时挤压最强
          const squashCurve = Math.cos(t * 2)
          squash = -squashCurve * GAME_CONFIG.VISUAL.ANIM_SQUASH_AMP
        } else {
          // 待机动画：呼吸起伏 / 观众欢呼
          const isSpectator = entity.type === 'spectator'
          const tIdle = tBase * (isSpectator ? 3.0 : GAME_CONFIG.VISUAL.IDLE_ANIM_FREQ)
          const idleSin = Math.sin(tIdle)
          
          // 性能优化：观众的缩放幅度稍微大一点，频率更快，模拟欢呼
          const amp = isSpectator ? 0.12 : GAME_CONFIG.VISUAL.IDLE_ANIM_AMP
          squash = idleSin * amp
          
          const anchorY = asset.anchorY // 0.5 是中点，>0.5 是偏下
          const visualHeight = baseScale
          const heightChange = visualHeight * squash
          // 核心：补偿位移，确保脚底不动
          bounce = heightChange * (anchorY - 0.5)
        }

        let lungeX = 0, lungeZ = 0
        const lastActiveAttackTime = Math.max(entity.lastAttackTime || 0, entity.lastBurstTime || 0)
        const timeSinceAttack = currentTime - lastActiveAttackTime
        if (timeSinceAttack < GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION) {
          const p = timeSinceAttack / GAME_CONFIG.BATTLE.ATTACK_LUNGE_DURATION
          const strength = Math.sin(p * Math.PI) * (GAME_CONFIG.BATTLE.ATTACK_LUNGE_FORCE * 0.5)
          lungeX = Math.sin(entity.lastAttackAngle || 0) * strength
          lungeZ = Math.cos(entity.lastAttackAngle || 0) * strength
        }

        // 观众体型增大：如果是观众，在渲染时应用额外的缩放倍率
        const spectatorScaleMult = entity.type === 'spectator' ? 1.8 : 1.0
        const finalScaleX = baseScale * (1 - squash) * spectatorScaleMult
        const finalScaleY = baseScale * (1 + squash) * spectatorScaleMult

        _tempObj.position.set(entity.position.x + lungeX, (entity.position.y || 0) + bounce * spectatorScaleMult, entity.position.z + lungeZ)
        
        if (tilt !== 0) {
          _quat.setFromAxisAngle(_zAxis, tilt)
          _tempObj.quaternion.multiply(_quat)
        }

        // 3. 翻转逻辑
        if (entity.lastMoveX !== undefined) {
          const dotSide = entity.lastMoveX * _camRight.x + entity.lastMoveZ * _camRight.z
          
          // --- 核心优化：打破中轴线感 (Per-instance Visual Deadzone) ---
          // 利用实体的 animOffset (已有的随机值) 来产生一个每个实体唯一的“视觉偏好”
          // threshold 会在 -0.15 到 0.15 之间波动
          const bias = ((entity.animOffset || 0) % 1) * 0.3 - 0.15
          
          // 只有当投影值超过这个随机阈值时，才准许改变朝向意图
          if (Math.abs(dotSide) > Math.abs(bias)) {
            entity.facingFlip = (unitDef.facing || 'right') === 'right' ? dotSide < 0 : dotSide > 0
          }
        }

        if (entity.visualFlip === undefined) entity.visualFlip = entity.facingFlip ? -1 : 1
        const targetFlip = entity.facingFlip ? -1 : 1
        const flipSpeed = 4.6 / Math.max(0.01, GAME_CONFIG.VISUAL.FACING_FLIP_DURATION)
        const lerpFactor = 1 - Math.exp(-flipSpeed * (currentTime - (entity.lastVisualUpdate || currentTime - 0.016)))
        entity.visualFlip = THREE.MathUtils.lerp(entity.visualFlip, targetFlip, Math.min(1, lerpFactor))
        entity.lastVisualUpdate = currentTime
        
        // 4. 处理受击效果 (Hit Flash)
        const timeSinceHit = entity.health ? currentTime - (entity.health.lastHitTime || 0) : 999
        // 只有非友军单位 (玩家和敌人) 受击时才会闪白
        const shouldFlash = entity.type !== 'ally' && entity.health && timeSinceHit < GAME_CONFIG.VISUAL.HIT_FLASH_DURATION
        
        if (shouldFlash) {
          _tempColor.setRGB(5.0, 5.0, 5.0) // 触发 Shader 浅白剪影
          const flashP = 1 - (timeSinceHit / GAME_CONFIG.VISUAL.HIT_FLASH_DURATION)
          hitScale = 1 + Math.sin(flashP * Math.PI) * 0.1
        }

        // 5. 应用最终矩阵和颜色
        const vFlip = entity.visualFlip ?? (entity.facingFlip ? -1 : 1)
        _v1.set(vFlip * finalScaleX * hitScale, finalScaleY * hitScale, 1) 
        _tempObj.matrix.compose(_tempObj.position, _tempObj.quaternion, _v1)
        meshRef.current.setMatrixAt(i, _tempObj.matrix)
        meshRef.current.setColorAt(i, _tempColor)
        continue // 已经处理完，跳过下面的通用处理
      }

      // 默认处理 (死亡等)
      const vFlip = entity.visualFlip ?? (entity.facingFlip ? -1 : 1)
      const scaleY = baseScale * (1 + squash)
      const scaleX = baseScale * (1 - squash)
      _v1.set(vFlip * scaleX * hitScale, scaleY * hitScale, 1) 
      _tempObj.matrix.compose(_tempObj.position, _tempObj.quaternion, _v1)
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
      meshRef.current.setColorAt(i, _tempColor)
    }

    // 6. 核心优化：利用 mesh.count 限制渲染范围
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
      <meshBasicMaterial 
        map={asset?.texture || null} 
        transparent 
        alphaTest={0.5} 
        side={THREE.DoubleSide} 
        onBeforeCompile={(shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            // 纯白剪影模式 (受击)
            if (vColor.r > 4.0) {
                diffuseColor.rgb = vec3(0.6, 0.6, 0.6);
            } 
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
  const arenaSeats = useGameStore((state) => state.arenaSeats)
  const currentWave = useGameStore((state) => state.wave)
  const keys = useKeyboard()
  const scene = useThree(state => state.scene)

  useBattleSystems(keys, currentWave)

  const dofRef = useRef<any>(null)

  useFrame((state) => {
    AudioAssets.init(state.camera);
    if (!dofRef.current) return
    const player = world.entities.find(e => e.id === 'player-main')
    if (!player) return
    const distance = state.camera.position.distanceTo(_v1.set(player.position.x, (player.position.y || 0) + 1.2, player.position.z))
    const far = state.camera.far;
    const near = state.camera.near;
    const targetFocus = (far / (far - near)) * (1.0 - (near / distance));
    if (dofRef.current.circleOfConfusionMaterial) {
      dofRef.current.circleOfConfusionMaterial.uniforms.focusDistance.value = THREE.MathUtils.lerp(
        dofRef.current.circleOfConfusionMaterial.uniforms.focusDistance.value,
        targetFocus,
        0.1
      )
    }
  })

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        document.body.classList.add('is-grabbing')
      }
    }
    const handleMouseUp = () => {
      document.body.classList.remove('is-grabbing')
    }
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('blur', handleMouseUp)
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('blur', handleMouseUp)
      document.body.classList.remove('is-grabbing')
    }
  }, [])

  useEffect(() => {
    if (!selectedCharacter) return
    const initGame = async () => {
      await Promise.all([
        Assets.preloadAll(),
        AudioAssets.preload(['CLICK_CLEAN', 'SLASH', 'IMPACT', 'HIT_BODY'])
      ]);
      
      resetSpawner()
      world.clear() 
      createPlayer(selectedCharacter, 0, 0)
      
      // --- 高级架构设计：精准环形采样 + 射线高度测量 ---
      const raycaster = new THREE.Raycaster()
      const down = new THREE.Vector3(0, -1, 0)
      
      // 1. 确定禁区边界：扩大到正负 60
      const EXCLUSION_ZONE = 60
      const SAMPLE_MAX = 160 
      const SPECTATOR_COUNT = 3000 
      const SPECTATOR_POOL = ['bandit', 'archer', 'ally_chunyang', 'player_tiance', 'player_wanhua'] 
      
      scene.updateMatrixWorld(true)
      const arenaStands = scene.getObjectByName("arena-stands")
      const ground = scene.getObjectByName("ground-plane")
      const targets = [ground, arenaStands].filter(Boolean) as THREE.Object3D[]
      
      let count = 0
      let attempts = 0
      while (count < SPECTATOR_COUNT && attempts < 15000) {
        attempts++
        const rx = (Math.random() - 0.5) * SAMPLE_MAX * 2
        const rz = (Math.random() - 0.5) * SAMPLE_MAX * 2
        if (Math.abs(rx) < EXCLUSION_ZONE && Math.abs(rz) < EXCLUSION_ZONE) continue
        
        raycaster.set(new THREE.Vector3(rx, 150, rz), down)
        const intersects = raycaster.intersectObjects(targets, true)
        if (intersects.length > 0) {
          const hit = intersects[0]
          if (hit.point.y > 30) continue 
          const randomUnitId = SPECTATOR_POOL[Math.floor(Math.random() * SPECTATOR_POOL.length)]
          createSpectator(randomUnitId, hit.point.x, hit.point.y, hit.point.z)
          count++
        }
      }
    };
    initGame();
    return () => world.clear()
  }, [selectedCharacter, scene])

  return (
    <>
      <PerspectiveCamera makeDefault fov={40} near={0.1} far={1000} />
      <CameraSystem />
      <Stage />
      <Entities />
      <VFXManager />
      <EffectComposer disableNormalPass>
        <Bloom intensity={1.5} luminanceThreshold={1.0} luminanceSmoothing={0.05} mipmapBlur />
      </EffectComposer>
    </>
  )
}
