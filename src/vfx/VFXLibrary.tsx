/**
 * VFXLibrary: 特效表现图书馆
 * 
 * --- 核心约定 (Conventions) ---
 * 1. 本地空间基准：所有特效组件应默认朝向本地 +Z 轴进行设计。
 * 2. 职责边界：此处仅负责定义样式 (Geometry/Material) 和数学动画 (onUpdate)。
 * 3. 坐标对齐：VFXBase 已处理世界坐标和角度，此处 instance.position.z++ 即为向“前”推进。
 */

import * as THREE from 'three'
import { useMemo } from 'react'
import { VFXGroup } from './VFXBase'
import { GAME_CONFIG } from '../game/config'
import { Entity } from '../engine/ecs'

const _color = new THREE.Color()
const _euler = new THREE.Euler()
const _vStart = new THREE.Vector3()
const _vEnd = new THREE.Vector3()
const _m4 = new THREE.Matrix4()
const _quat = new THREE.Quaternion()

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
 * 特殊案例：点对点特效，覆盖了 Base 的默认位置逻辑
 */
export function ArrowVFX({ entities }: { entities: any[] }) {
  return (
    <VFXGroup
      entities={entities}
      limit={2000}
      geometry={<boxGeometry args={[0.06, 0.06, 1]} />}
      material={<meshBasicMaterial transparent blending={THREE.AdditiveBlending} depthWrite={false} />}
      onUpdate={(instance, progress, entity) => {
        const fx = entity.effect
        _vStart.set(fx.attackerPos.x, 1.2, fx.attackerPos.z)
        _vEnd.set(fx.targetPos.x, 1.2, fx.targetPos.z)
        instance.position.lerpVectors(_vStart, _vEnd, progress)
        _m4.lookAt(_vStart, _vEnd, THREE.Object3D.DEFAULT_UP)
        instance.quaternion.setFromRotationMatrix(_m4)
        const scaleZ = Math.sin(progress * Math.PI) * 2.0 + 0.1
        const dist = _vStart.distanceTo(_vEnd)
        instance.scale.set(1, 1, Math.min(scaleZ, dist * 0.5))
        const opacity = (1 - progress) * 2
        _color.set("#ffaa00").multiplyScalar(opacity);
        (instance as any)._color = _color
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
