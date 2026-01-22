import * as THREE from 'three'
import { VFXGroup } from './VFXBase'
import { GAME_CONFIG } from '../game/config'

// 缓存复用对象，减少 GC 压力
const _color = new THREE.Color()
const _euler = new THREE.Euler()
const _vec3 = new THREE.Vector3()

/**
 * 刀光特效 (SlashingVFX)
 * 交付一个完整的视觉样式包，内部自动实现实例化
 */
export function SlashingVFX({ entities }: { entities: any[] }) {
  return (
    <VFXGroup
      entities={entities}
      geometry={<ringGeometry args={[0.8, 1.2, 32, 1, -Math.PI * 0.6, Math.PI * 1.2]} />}
      material={
        <meshBasicMaterial 
          transparent 
          blending={THREE.AdditiveBlending} 
          side={THREE.DoubleSide} 
          depthWrite={false} 
        />
      }
      onUpdate={(instance, progress, entity) => {
        const fx = entity.effect
        const angle = fx.angle || 0
        const pushDist = GAME_CONFIG.BATTLE.MELEE_VFX_PUSH

        // 1. 位置同步 (考虑攻击者偏移)
        instance.position.set(
          entity.position.x + Math.sin(angle) * pushDist,
          0.6,
          entity.position.z + Math.cos(angle) * pushDist
        )

        // 2. 旋转同步 (平躺看板)
        _euler.set(-Math.PI / 2, 0, angle - Math.PI / 2)
        instance.quaternion.setFromEuler(_euler)

        // 3. 动画：由内向外扩散
        const scale = 0.5 + progress * 3.5
        instance.scale.set(scale, scale, 1)

        // 4. 颜色与淡出
        const opacity = Math.pow(1 - progress, 2)
        const baseColor = fx.attackerType === 'player' ? "#ff2222" : "#ffffff"
        _color.set(baseColor).multiplyScalar(opacity)
        instance.color.copy(_color)
      }}
    />
  )
}

/**
 * 箭矢/弹道特效 (ArrowVFX)
 * 展示了如何在底座上快速定义复杂的线性插值动画
 */
export function ArrowVFX({ entities }: { entities: any[] }) {
  return (
    <VFXGroup
      entities={entities}
      limit={2000}
      geometry={<boxGeometry args={[0.06, 0.06, 1]} />}
      material={
        <meshBasicMaterial 
          transparent 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      }
      onUpdate={(instance, progress, entity) => {
        const fx = entity.effect
        
        // 1. 轨迹计算
        const start = _vec3.set(fx.attackerPos.x, 1.2, fx.attackerPos.z)
        const end = new THREE.Vector3(fx.targetPos.x, 1.2, fx.targetPos.z)
        
        // 插值位置
        instance.position.lerpVectors(start, end, progress)

        // 2. 朝向计算 (仅在第一帧或必要时计算会更好，这里演示基础用法)
        const m = new THREE.Matrix4()
        m.lookAt(start, end, new THREE.Vector3(0, 1, 0))
        instance.quaternion.setFromRotationMatrix(m)

        // 3. 动画：前半段伸长，后半段缩短 (模拟流光)
        const scaleZ = Math.sin(progress * Math.PI) * 2.0 + 0.1
        const dist = start.distanceTo(end)
        instance.scale.set(1, 1, Math.min(scaleZ, dist * 0.5))

        // 4. 颜色与淡出
        const opacity = (1 - progress) * 2
        _color.set("#ffaa00").multiplyScalar(opacity)
        instance.color.copy(_color)
      }}
    />
  )
}
