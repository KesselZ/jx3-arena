/**
 * VFXLibrary: 特效表现图书馆
 * 
 * --- 核心约定 (Conventions) ---
 * 1. 本地空间基准：所有特效组件应默认朝向本地 +Z 轴进行设计。
 * 2. 职责边界：此处仅负责定义样式 (Geometry/Material) 和数学动画 (onUpdate)。
 * 3. 坐标对齐：VFXBase 已处理世界坐标和角度，此处 instance.position.z++ 即为向“前”推进。
 */

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances } from '@react-three/drei'
import { VFXGroup } from './VFXBase'
import { GAME_CONFIG } from '../data/config'
import { Entity } from '../engine/ecs'
import { useGameStore } from '../store/useGameStore'

const _color = new THREE.Color()
const _euler = new THREE.Euler()
const _vStart = new THREE.Vector3()
const _vEnd = new THREE.Vector3()
const _m4 = new THREE.Matrix4()
const _quat = new THREE.Quaternion()
const _tempObj = new THREE.Object3D()

/**
 * 刀光特效 (SlashingVFX)
 * 遵循 Z 轴正方向约定，定义了核心亮光与外围气浪两层表现
 */
export function SlashingVFX({ entities }: { entities: any[] }) {
  const arcTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const centerX = 256, centerY = 256, radius = 200;
    const grad = ctx.createRadialGradient(centerX, centerY, radius - 50, centerX, centerY, radius + 50)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)')
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, Math.PI * 1.1, Math.PI * 1.9)
    ctx.lineTo(centerX, centerY)
    ctx.fill()
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <>
      <VFXGroup
        entities={entities}
        geometry={<planeGeometry args={[2.5, 2.5]} />}
        material={<meshBasicMaterial map={arcTexture} transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />}
        onUpdate={(instance, progress, entity) => {
          instance.position.z += GAME_CONFIG.BATTLE.MELEE_VFX_PUSH
          instance.position.y = 0.8
          _euler.set(-Math.PI / 2, 0, (progress - 0.5) * 0.4)
          instance.quaternion.multiply(_quat.setFromEuler(_euler))
          instance.scale.set(0.8 + progress * 2.5, 0.8 + progress * 2.5, 1)
          const opacity = Math.pow(1 - progress, 1.5)
          _color.set(entity.effect.attackerType === 'player' ? "#ff4422" : "#ffffff").multiplyScalar(opacity)
          ;(instance as any)._color = _color
        }}
      />

      <VFXGroup
        entities={entities}
        geometry={<planeGeometry args={[3.5, 3.5]} />}
        material={<meshBasicMaterial map={arcTexture} transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} opacity={0.4} />}
        onUpdate={(instance, progress, entity) => {
          instance.position.z += GAME_CONFIG.BATTLE.MELEE_VFX_PUSH * 1.2
          instance.position.y = 0.78
          _euler.set(-Math.PI / 2, 0, -(progress - 0.5) * 0.3)
          instance.quaternion.multiply(_quat.setFromEuler(_euler))
          instance.scale.set(1.2 + progress * 3.0, 1.2 + progress * 3.0, 1)
          const opacity = Math.pow(1 - progress, 3) * 0.5
          _color.set(entity.effect.attackerType === 'player' ? "#ffaa88" : "#cccccc").multiplyScalar(opacity)
          ;(instance as any)._color = _color
        }}
      />
    </>
  )
}

/**
 * 箭矢特效 (ArrowVFX)
 * 已改为逻辑实体驱动：直接同步实体的物理坐标
 */
export function ArrowVFX({ entities }: { entities: Entity[] }) {
  return (
    <VFXGroup
      entities={entities}
      limit={2000}
      geometry={<boxGeometry args={[0.06, 0.06, 1]} />}
      material={<meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} />}
      onUpdate={(instance, progress, entity) => {
        // 1. 同步逻辑层坐标
        instance.position.set(entity.position.x, entity.position.y, entity.position.z)
        
        // 2. 同步逻辑层旋转
        if (entity.quaternion) {
          instance.quaternion.set(
            entity.quaternion.x,
            entity.quaternion.y,
            entity.quaternion.z,
            entity.quaternion.w
          )
        }

        // 3. 视觉：固定大小
        instance.scale.set(1, 1, 1)

        // 4. 颜色 (黄色/橙色)
        _color.set("#ffaa00")
        ;(instance as any)._color = _color
      }}
    />
  )
}

/**
 * 飞剑特效 (AirSwordVFX)
 * 逻辑实体驱动：直接同步实体的物理坐标和旋转
 */
export function AirSwordVFX({ entities }: { entities: Entity[] }) {
  return (
    <VFXGroup
      entities={entities}
      limit={500}
      geometry={<boxGeometry args={[0.1, 0.1, 1.2]} />}
      material={<meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} />}
      onUpdate={(instance, progress, entity) => {
        // 1. 同步逻辑层坐标
        instance.position.set(entity.position.x, entity.position.y, entity.position.z)
        
        // 2. 同步逻辑层旋转
        if (entity.quaternion) {
          instance.quaternion.set(
            entity.quaternion.x,
            entity.quaternion.y,
            entity.quaternion.z,
            entity.quaternion.w
          )
        }

        // 3. 视觉增强：剑身微颤和缩放动画
        const pulse = Math.sin(Date.now() * 0.02) * 0.1
        instance.scale.set(1 + pulse, 1 + pulse, 1.2)

        // 4. 颜色与透明度 (根据寿命衰减)
        const lifeP = entity.projectile ? entity.projectile.lifeTime / 2.0 : 1.0 // 假设寿命2秒
        _color.set("#00ffff").multiplyScalar(Math.min(1, lifeP * 2))
        ;(instance as any)._color = _color
      }}
    />
  )
}

/**
 * 出生预警特效 (SpawnWarningVFX)
 * 职责：在地面显示一个闪烁的叉叉，指示即将生成的单位
 */
export function SpawnWarningVFX({ entities }: { entities: Entity[] }) {
  const meshRef = useRef<any>(null)

  // 1. 动态生成一个真正的、带统一黑边的 X 形状贴图
  const crossTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    
    ctx.clearRect(0, 0, 128, 128)
    
    // 绘制路径定义
    const drawX = (width: number, color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.beginPath()
      // 调整坐标，稍微往里缩一点点，防止加粗后切边
      const margin = 20
      ctx.moveTo(margin, margin); ctx.lineTo(128 - margin, 128 - margin)
      ctx.moveTo(128 - margin, margin); ctx.lineTo(margin, 128 - margin)
      ctx.stroke()
    }

    // 大胆加粗：黑边设为 48，内部填充设为 24
    drawX(48, '#000000')
    drawX(24, '#ffffff')
    
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  useFrame(() => {
    if (!meshRef.current) return
    const isPaused = useGameStore.getState().isPaused
    
    const now = isPaused 
      ? (meshRef.current._lastTime || performance.now() / 1000)
      : performance.now() / 1000
    
    meshRef.current._lastTime = now

    const count = entities.length

    for (let i = 0; i < count; i++) {
      const entity = entities[i]
      
      // 2. 优化闪烁逻辑：固定 8Hz 的干净切换，并加入随机相位偏移打破同步
      const freq = 8.0 
      const phase = (entity.animOffset || 0) * 10.0 // 利用已有随机值，零额外开销
      const isVisible = Math.sin((now + phase) * Math.PI * freq) > 0
      
      _tempObj.position.set(entity.position.x, 0.05, entity.position.z)
      _euler.set(-Math.PI / 2, 0, 0) // 贴图本身已经是 X，不需要再旋转 45 度
      _tempObj.quaternion.setFromEuler(_euler)
      
      // 如果处于“消失”帧，将缩放设为 0，实现彻底消失
      const s = isVisible ? 1 : 0
      _tempObj.scale.set(s, s, s)
      _tempObj.updateMatrix()
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
      
      _color.set(entity.type === 'enemy' ? "#ff2222" : "#22ff22")
      meshRef.current.setColorAt(i, _color)
    }

    meshRef.current.count = count
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <Instances ref={meshRef} limit={1000} frustumCulled={false}>
      <planeGeometry args={[0.8, 0.8]} />
      <meshBasicMaterial map={crossTexture} transparent side={THREE.DoubleSide} depthWrite={false} />
    </Instances>
  )
}

// 预留缓存向量，避免在循环中创建对象
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _pos = new THREE.Vector3()

/**
 * 伤害飘字特效 (DamageTextVFX)
 * 职责：高性能实例化渲染所有伤害数字
 * 技术：1 Draw Call + Canvas 图集 + 相机空间对齐算法
 */
export function DamageTextVFX({ entities }: { entities: Entity[] }) {
  const meshRef = useRef<any>(null)
  const attrRef = useRef<any>(null)

  // 1. 动态生成 0-9 数字图集 (武侠风：描边 + 渐变)
  const atlasTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 48px "Fusion Pixel Font", "DotGothic16", sans-serif'
    
    for (let i = 0; i < 10; i++) {
      const x = i * 51.2 + 25.6
      const y = 32
      
      // 绘制描边
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 8
      ctx.strokeText(i.toString(), x, y)
      
      // 绘制主体 (金黄渐变)
      const grad = ctx.createLinearGradient(x, y - 20, x, y + 20)
      grad.addColorStop(0, '#fff4e0')
      grad.addColorStop(1, '#d4af37')
      ctx.fillStyle = grad
      ctx.fillText(i.toString(), x, y)
    }
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
    return tex
  }, [])

  // 2. 准备实例属性数组 (存储每个实例对应的数字索引 0-9)
  const digitIndices = useMemo(() => new Float32Array(2000), [])

  useFrame((state) => {
    if (!meshRef.current || !attrRef.current) return
    const isPaused = useGameStore.getState().isPaused
    
    const now = isPaused 
      ? (meshRef.current._lastTime || performance.now() / 1000)
      : performance.now() / 1000
    
    meshRef.current._lastTime = now

    const count = Math.min(entities.length, 2000)

    // 获取当前相机的右向量和上向量，用于对齐屏幕空间排版
    _right.set(1, 0, 0).applyQuaternion(state.camera.quaternion)
    _up.set(0, 1, 0).applyQuaternion(state.camera.quaternion)

    for (let i = 0; i < count; i++) {
      const e = entities[i]
      const d = e.damageDigit!
      const age = now - d.startTime
      const duration = 0.8 // 飘字持续 0.8s
      
      if (age > duration) {
        _tempObj.scale.set(0, 0, 0)
      } else {
        const p = age / duration
        
        // --- 爽感进化 1: 爆发式上升 ---
        // 使用 pow(p, 0.3) 确保初速度极快，且 y 轴位移单调递增，绝不回落
        const jump = Math.pow(p, 0.3) * 2.5 
        const fadeOut = 1.0 - Math.pow(p, 2) // 平滑淡出
        
        // --- 爽感进化 2: 弹性弹出缩放 (Overshoot) ---
        let s = 1.0
        if (p < 0.15) {
          s = (p / 0.15) * 1.4 // 快速放大到 1.4 倍
        } else if (p < 0.3) {
          s = 1.4 - ((p - 0.15) / 0.15) * 0.4 // 迅速回弹到 1.0 倍
        } else {
          s = 1.0
        }
        const finalScale = s * 0.5 * fadeOut
        
        // --- 爽感进化 3: 随机喷发感 ---
        // 利用 startTime 作为种子，让每一跳伤害都有微小的随机左右偏移
        const seed = d.startTime * 1000
        const drift = (Math.sin(seed) * 0.5) * p 
        
        // 基于相机空间的排版算法
        const spacing = 0.35 * finalScale
        const hOffset = (d.offset - (d.totalWidth - 1) / 2) * spacing
        
        // 计算最终位置：受击点(胸部 0.8m) + 随机漂移 + 相机右偏 + 爆发上升
        _pos.set(e.position.x, e.position.y + 0.8, e.position.z)
        _pos.addScaledVector(_right, hOffset + drift)
        _pos.addScaledVector(_up, jump)
        
        _tempObj.position.copy(_pos)
        _tempObj.scale.set(finalScale, finalScale, finalScale)
        _tempObj.quaternion.copy(state.camera.quaternion)
        
        digitIndices[i] = d.value
      }
      
      _tempObj.updateMatrix()
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
    }

    meshRef.current.count = count
    meshRef.current.instanceMatrix.needsUpdate = true
    attrRef.current.needsUpdate = true
  })

  return (
    <Instances 
      ref={meshRef} 
      limit={2000} 
      frustumCulled={false}
      renderOrder={999}
    >
      <planeGeometry args={[1, 1]}>
        <instancedBufferAttribute 
          ref={attrRef}
          attach="attributes-aDigitIndex" 
          args={[digitIndices, 1]} 
        />
      </planeGeometry>
      <meshBasicMaterial 
        map={atlasTexture} 
        transparent 
        depthTest={false}
        depthWrite={false}
        onBeforeCompile={(shader) => {
          shader.vertexShader = `
            attribute float aDigitIndex;
            varying float vDigitIndex;
            ${shader.vertexShader}
          `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vDigitIndex = aDigitIndex;
            `
          );
          
          shader.fragmentShader = `
            varying float vDigitIndex;
            ${shader.fragmentShader}
          `.replace(
            '#include <map_fragment>',
            `
            // 将 UV.x 限制在 0.1 范围内，并根据数字索引偏移
            vec2 digitUv = vMapUv;
            digitUv.x = (digitUv.x * 0.1) + (vDigitIndex * 0.1);
            vec4 sampledColor = texture2D(map, digitUv);
            diffuseColor *= sampledColor;
            `
          );
        }}
      />
    </Instances>
  )
}
