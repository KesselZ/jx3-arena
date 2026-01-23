import React from 'react'
import { GAME_CONFIG } from '../../data/config'
import { TPSCamera } from './TPSCamera'
import { OrbitCamera } from './OrbitCamera'

/**
 * CameraSystem: 相机系统分发器
 * 职责：根据全局配置决定使用哪种相机控制模式
 */
export function CameraSystem() {
  const mode = GAME_CONFIG.VISUAL.CAMERA_MODE

  return (
    <>
      {mode === 'TPS' && <TPSCamera />}
      {mode === 'ORBIT' && <OrbitCamera />}
    </>
  )
}
