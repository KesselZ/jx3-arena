import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { GAME_CONFIG } from '../game/config'

/**
 * 3D 刀光特效：自带“局部预设”的智能组件
 */
export function MeleeSlash({ entity }: { entity: any }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const fx = entity.effect
  
  // 特效自己定义“我要平躺”
  const quaternion = useMemo(() => {
    // 关键修正：从 + PI/2 改为 - PI/2，纠正 180 度反向问题
    return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0, (fx.angle || 0) - Math.PI / 2)
    )
  }, [fx.angle])

  useFrame(() => {
    if (!meshRef.current) return
    const age = (performance.now() / 1000) - fx.startTime
    const progress = Math.min(1, age / fx.duration)
    const scale = 0.5 + progress * 3.0
    meshRef.current.scale.set(scale, scale, 1)
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.opacity = Math.pow(1 - progress, 2)
    }
  })

  // 计算特效的视觉位置：从发射点(攻击者)向目标方向推进
  const visualPos = useMemo(() => {
    const pushDist = GAME_CONFIG.BATTLE.MELEE_VFX_PUSH; 
    return [
      entity.position.x + Math.sin(fx.angle || 0) * pushDist,
      0.5,
      entity.position.z + Math.cos(fx.angle || 0) * pushDist
    ]
  }, [entity.position, fx.angle])

  return (
    <mesh 
      position={visualPos as [number, number, number]} 
      quaternion={quaternion}
      ref={meshRef}
    >
      <ringGeometry args={[0.8, 1.2, 32, 1, -Math.PI * 0.6, Math.PI * 1.2]} />
      <meshBasicMaterial 
        color={fx.attackerType === 'player' ? "#ff2222" : "#ffffff"} 
        transparent 
        opacity={1} 
        side={THREE.DoubleSide} 
        blending={THREE.AdditiveBlending} 
      />
    </mesh>
  )
}

/**
 * 3D 箭矢流光：增加弹道感，用于观察发射方向
 */
export function ArrowTracer({ entity }: { entity: any }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const fx = entity.effect
  
  const { start, end, quat, dist } = useMemo(() => {
    const s = new THREE.Vector3(fx.attackerPos.x, 1.2, fx.attackerPos.z)
    const e = new THREE.Vector3(fx.targetPos.x, 1.2, fx.targetPos.z)
    const m = new THREE.Matrix4()
    // 让物体看向终点
    m.lookAt(s, e, new THREE.Vector3(0, 1, 0))
    const q = new THREE.Quaternion().setFromRotationMatrix(m)
    return { start: s, end: e, quat: q, dist: s.distanceTo(e) }
  }, [fx.attackerPos, fx.targetPos])

  useFrame(() => {
    if (!meshRef.current) return
    const age = (performance.now() / 1000) - fx.startTime
    const progress = Math.min(1, age / fx.duration)
    
    // 动画：从起点滑向终点
    // 我们让物体在 start 和 end 之间插值
    meshRef.current.position.lerpVectors(start, end, progress)
    
    // 视觉：前半段伸长，后半段缩短
    const scaleZ = Math.sin(progress * Math.PI) * 2.0 + 0.1
    meshRef.current.scale.z = Math.min(scaleZ, 1.0) 

    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.opacity = (1 - progress) * 2
    }
  })

  return (
    <mesh position={start} quaternion={quat} ref={meshRef}>
      {/* 使用一个小盒子代表箭矢主体 */}
      <boxGeometry args={[0.06, 0.06, dist * 0.3]} />
      <meshBasicMaterial color="#ffaa00" transparent opacity={1} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}
