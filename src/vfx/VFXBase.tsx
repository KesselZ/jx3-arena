/**
 * VFXBase: 高性能特效渲染底座
 * 
 * --- 核心约定 (Conventions) ---
 * 1. Z轴正方向约定：所有特效在 Library 中应默认朝向本地 +Z 轴设计。
 * 2. 逻辑与表现分离：
 *    - VFXBase (逻辑层): 负责世界坐标同步、根据 entity.effect.angle 自动旋转对准目标。
 *    - VFXLibrary (表现层): 负责定义几何体、材质及本地空间的数学动画 (缩放、颜色、本地位移)。
 * 3. 性能优化：使用全局 Scratchpad 对象，严禁在 onUpdate 循环中 new 对象。
 * 4. 生命周期：VFXBase 根据 entity.effect.duration 自动从 ECS 中移除过期实体。
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instances } from '@react-three/drei'
import * as THREE from 'three'
import { world } from '../engine/ecs'
import { GAME_CONFIG } from '../data/config'

// 全局渲染临时对象
const _tempObj = new THREE.Object3D()
const _up = new THREE.Vector3(0, 1, 0)
const _vScale = new THREE.Vector3(1, 1, 1)

/**
 * VFXGroup: 高性能特效渲染底座
 */
export function VFXGroup({ 
  entities, 
  geometry, 
  material, 
  onUpdate, 
  limit = 1000,
  renderOrder = 10
}: { 
  entities: any[], 
  geometry: React.ReactNode, 
  material: React.ReactNode,
  onUpdate: (instance: THREE.Object3D, progress: number, entity: any) => void,
  limit?: number,
  renderOrder?: number
}) {
  const meshRef = useRef<any>(null)

  useFrame(() => {
    if (!meshRef.current) return
    
    const now = performance.now() / 1000
    const count = entities.length

    for (let i = 0; i < count; i++) {
      const entity = entities[i]
      const fx = entity.effect
      if (!fx) continue

      const age = now - fx.startTime
      const progress = Math.min(1, age / fx.duration)

      if (age > fx.duration) {
        world.remove(entity)
        continue
      }

      // --- 1. 【逻辑接管层】：初始化世界空间变换 ---
      _tempObj.position.set(entity.position.x, entity.position.y || 0, entity.position.z)
      
      // 【对齐逻辑】：fx.angle 是世界角度，Math.PI 补偿贴图默认朝向
      if (fx.angle !== undefined) {
        _tempObj.quaternion.setFromAxisAngle(_up, fx.angle + Math.PI)
      } else {
        _tempObj.quaternion.set(0, 0, 0, 1)
      }
      
      _vScale.set(1, 1, 1)
      // 注意：这里不再调用 _tempObj.updateMatrix()，而是把 _tempObj 传给 onUpdate 进一步修改

      // --- 2. 【美术定义层】：调用 Library 处理本地空间表现 ---
      onUpdate(_tempObj, progress, entity)

      // --- 3. 应用最终矩阵 (使用 compose 替代 updateMatrix，性能更高) ---
      // 如果 onUpdate 里面修改了 scale，我们需要确保它被应用
      meshRef.current.setMatrixAt(i, _tempObj.matrix.compose(_tempObj.position, _tempObj.quaternion, _tempObj.scale))
      
      if (meshRef.current.instanceColor && (_tempObj as any)._color) {
        meshRef.current.setColorAt(i, (_tempObj as any)._color)
      }
    }

    for (let i = count; i < limit; i++) {
      _tempObj.position.set(0, -1000, 0)
      _tempObj.updateMatrix()
      meshRef.current.setMatrixAt(i, _tempObj.matrix)
    }

    meshRef.current.count = count
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <Instances ref={meshRef} limit={limit} frustumCulled={false} castShadow={false} receiveShadow={false} renderOrder={renderOrder}>
      {geometry}
      {material}
    </Instances>
  )
}
