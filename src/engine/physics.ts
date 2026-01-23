/**
 * 极简物理公式库 (Engine 层)
 * 职责：提供纯粹的物理数学计算，不包含业务逻辑和循环
 */
export const Physics = {
  /**
   * 应用阻尼衰减
   * @param v 速度向量
   * @param damping 阻尼系数 (0-1)
   * @param delta 帧时间
   */
  applyDamping: (v: { x: number; y: number; z: number }, damping: number, delta: number) => {
    // 使用指数衰减，保证不同帧率下体感一致
    const factor = Math.pow(damping, delta * 60);
    v.x *= factor;
    v.y *= factor;
    v.z *= factor;
    
    // 阈值清理，防止微小浮点数计算
    if (Math.abs(v.x) < 0.001) v.x = 0;
    if (Math.abs(v.y) < 0.001) v.y = 0;
    if (Math.abs(v.z) < 0.001) v.z = 0;
  },

  /**
   * 处理重力和地面碰撞
   * @returns 是否在地面
   */
  applyGravity: (
    pos: { x: number; y: number; z: number }, 
    vel: { x: number; y: number; z: number }, 
    gravity: number, 
    delta: number
  ): boolean => {
    if (pos.y > 0 || vel.y !== 0) {
      vel.y -= gravity * delta;
      pos.y += vel.y * delta;

      if (pos.y <= 0) {
        pos.y = 0;
        vel.y = 0;
        return true;
      }
      return false;
    }
    return true;
  }
};
