import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { world } from '../ecs'
import { GAME_CONFIG } from '../../game/config'

/**
 * TPSCamera: 巫师 3 / 魔兽世界风格的第三人称相机
 * 职责：手动计算球面坐标，实现绕点旋转和鼠标锁定
 */
export function TPSCamera() {
  const { camera, gl } = useThree()
  
  // 核心旋转状态 (弧度)
  const rotation = useRef({ 
    theta: Math.PI, 
    phi: Math.PI / 6 
  })
  
  const targetDistance = useRef(15)
  const currentDistance = useRef(15)
  const lastLockTime = useRef(0)
  const isLocked = useRef(false)
  
  const _v = new THREE.Vector3()
  const _target = new THREE.Vector3()

  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement
      isLocked.current = locked
      if (locked) lastLockTime.current = performance.now()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return
      if (performance.now() - lastLockTime.current < 100) return
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return

      const sensitivity = 0.002
      // 左右移动鼠标 -> 旋转相机环绕角度
      rotation.current.theta -= e.movementX * sensitivity
      
      // 垂直角度限制 (严格遵循 GAME_CONFIG)
      const { CAMERA_MIN_POLAR, CAMERA_MAX_POLAR } = GAME_CONFIG.VISUAL
      // 注意：球面坐标系的 phi 是从水平面往上的角度，而 Polar 是从垂直轴往下的角度
      // 所以转换公式为：phi = PI/2 - Polar
      const minPhi = Math.PI / 2 - CAMERA_MAX_POLAR
      const maxPhi = Math.PI / 2 - CAMERA_MIN_POLAR

      rotation.current.phi = THREE.MathUtils.clamp(
        rotation.current.phi + e.movementY * sensitivity,
        minPhi,
        maxPhi
      )
    }

    const handleCanvasClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock()
      }
    }

    const handleWheel = (e: WheelEvent) => {
      const { ZOOM_MIN, ZOOM_MAX, ZOOM_SENSITIVITY } = GAME_CONFIG.VISUAL
      targetDistance.current = THREE.MathUtils.clamp(
        targetDistance.current + e.deltaY * ZOOM_SENSITIVITY,
        ZOOM_MIN,
        ZOOM_MAX
      )
    }

    gl.domElement.addEventListener('click', handleCanvasClick)
    document.addEventListener('pointerlockchange', handleLockChange)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('wheel', handleWheel, { passive: true })
    
    return () => {
      gl.domElement.removeEventListener('click', handleCanvasClick)
      document.removeEventListener('pointerlockchange', handleLockChange)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('wheel', handleWheel)
    }
  }, [gl])

  useFrame(() => {
    const player = world.entities.find(e => e.id === 'player-main')
    if (!player) return

    const { CAMERA_LERP, ZOOM_LERP } = GAME_CONFIG.VISUAL

    // 1. 平滑缩放
    currentDistance.current = THREE.MathUtils.lerp(currentDistance.current, targetDistance.current, ZOOM_LERP)

    // 2. 计算理想位置 (球面坐标)
    const r = currentDistance.current
    const p = rotation.current.phi
    const t = rotation.current.theta

    const offsetX = r * Math.cos(p) * Math.sin(t)
    const offsetY = r * Math.sin(p)
    const offsetZ = r * Math.cos(p) * Math.cos(t)

    // 目标聚焦：玩家头部位置
    _target.set(player.position.x, player.position.y + 1.2, player.position.z)
    
    // 相机最终理想位置
    const idealPos = _v.set(
      _target.x + offsetX,
      _target.y + offsetY,
      _target.z + offsetZ
    )

    // 3. 平滑物理运动
    camera.position.lerp(idealPos, CAMERA_LERP)
    camera.lookAt(_target)
    
    // 强制更新矩阵，确保视锥体裁切计算正确
    camera.updateMatrixWorld()
  })

  return null
}
