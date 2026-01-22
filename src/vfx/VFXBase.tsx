import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { world } from '../engine/ecs'

/**
 * VFXBase: 特效渲染底座
 * 职责：
 * 1. 自动开启 GPU 实例化 (Instances)
 * 2. 自动管理每个实例的生命周期 (播完自毁)
 * 3. 自动提供动画进度 (progress)
 */
export function VFXGroup({ 
  entities, 
  geometry, 
  material, 
  onUpdate, 
  limit = 1000 
}: { 
  entities: any[], 
  geometry: React.ReactNode, 
  material: React.ReactNode,
  onUpdate: (instance: any, progress: number, entity: any) => void,
  limit?: number
}) {
  return (
    <Instances limit={limit} range={entities.length} frustumCulled={false}>
      {geometry}
      {material}
      {entities.map(entity => (
        <VFXInstance key={entity.id} entity={entity} onUpdate={onUpdate} />
      ))}
    </Instances>
  )
}

function VFXInstance({ entity, onUpdate }: { entity: any, onUpdate: any }) {
  const ref = useRef<any>(null)
  
  useFrame(() => {
    if (!ref.current) return
    const fx = entity.effect
    const now = performance.now() / 1000
    const age = now - fx.startTime
    const progress = Math.min(1, age / fx.duration)

    // 自动清理：生命周期结束时从 ECS 中移除实体
    // 注意：如果是多零件特效，多个 VFXInstance 可能会尝试移除同一个 entity，
    // miniplex.remove 是幂等的，所以这是安全的。
    if (age > fx.duration) {
      world.remove(entity)
      return
    }
    
    // 执行特定特效的动画样式
    onUpdate(ref.current, progress, entity)
  })
  
  // 优雅修复：初始状态设为缩放 0，防止在 useFrame 计算出正确位置前的第一帧闪现鬼影
  return <Instance ref={ref} scale={0} />
}
