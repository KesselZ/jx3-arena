import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from '../game/world'
import { GAME_CONFIG } from '../game/config'

/**
 * 工业级相机控制 Hook
 * 职责：处理 WoW 风格的主角平滑跟随以及丝滑的滚轮缩放
 */
export function useSmoothCamera(orbitControlsRef: React.RefObject<any>) {
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
    if (player && orbitControlsRef.current) {
      const { CAMERA_LERP, ZOOM_LERP } = GAME_CONFIG.VISUAL
      
      // 1. 平滑跟随：使用增量同步法
      targetPos.current.set(player.position.x, player.position.y, player.position.z)
      const oldTarget = new THREE.Vector3().copy(orbitControlsRef.current.target)
      
      // 让 target 靠近玩家
      orbitControlsRef.current.target.lerp(targetPos.current, CAMERA_LERP)
      
      // 计算位移增量并同步给相机底座
      const delta = new THREE.Vector3().subVectors(orbitControlsRef.current.target, oldTarget)
      state.camera.position.add(delta)

      // 2. 丝滑缩放：手动插值控制距离约束
      currentZoom.current = THREE.MathUtils.lerp(currentZoom.current, zoomTarget.current, ZOOM_LERP)
      orbitControlsRef.current.minDistance = currentZoom.current
      orbitControlsRef.current.maxDistance = currentZoom.current
      
      orbitControlsRef.current.update()
    }
  })
}
