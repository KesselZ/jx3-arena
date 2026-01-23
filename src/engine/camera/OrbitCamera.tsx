import React, { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../ecs'
import { GAME_CONFIG } from '../../data/config'

/**
 * OrbitCamera: 传统的轨道相机
 * 职责：使用 OrbitControls 实现拖拽旋转，并平滑跟随主角
 */
export function OrbitCamera() {
  const controlsRef = useRef<any>(null)
  const targetPos = useRef(new THREE.Vector3())
  const zoomTarget = useRef(15)
  const currentZoom = useRef(15)

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const { ZOOM_MIN, ZOOM_MAX, ZOOM_SENSITIVITY } = GAME_CONFIG.VISUAL
      zoomTarget.current = THREE.MathUtils.clamp(
        zoomTarget.current + e.deltaY * ZOOM_SENSITIVITY, 
        ZOOM_MIN, 
        ZOOM_MAX
      )
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  useFrame((state) => {
    const player = world.entities.find(e => e.id === 'player-main')
    if (!player || !controlsRef.current) return

    const { CAMERA_LERP, ZOOM_LERP, CAMERA_MIN_POLAR, CAMERA_MAX_POLAR } = GAME_CONFIG.VISUAL
    
    // 1. 平滑跟随：让 OrbitControls 的 target 靠近玩家
    targetPos.current.set(player.position.x, player.position.y + 1, player.position.z)
    const oldTarget = new THREE.Vector3().copy(controlsRef.current.target)
    controlsRef.current.target.lerp(targetPos.current, CAMERA_LERP)
    
    // 同步相机位置增量
    const delta = new THREE.Vector3().subVectors(controlsRef.current.target, oldTarget)
    state.camera.position.add(delta)

    // 2. 丝滑缩放
    currentZoom.current = THREE.MathUtils.lerp(currentZoom.current, zoomTarget.current, ZOOM_LERP)
    controlsRef.current.minDistance = currentZoom.current
    controlsRef.current.maxDistance = currentZoom.current
    
    // 3. 应用配置限制
    controlsRef.current.minPolarAngle = CAMERA_MIN_POLAR
    controlsRef.current.maxPolarAngle = CAMERA_MAX_POLAR
    
    controlsRef.current.update()
  })

  return (
    <OrbitControls 
      ref={controlsRef}
      makeDefault
      enablePan={false}
      enableDamping={true}
      dampingFactor={0.05}
    />
  )
}
