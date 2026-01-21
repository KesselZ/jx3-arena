import { world } from '../game/world';

/**
 * 生命周期系统：通用清理器
 * 职责：检查所有带有 lifetime 的实体，倒计时结束后自动销毁
 */
export const lifetimeSystem = (delta: number) => {
  for (const entity of world.entities) {
    if (entity.lifetime) {
      entity.lifetime.remaining -= delta;
      
      if (entity.lifetime.remaining <= 0) {
        world.remove(entity);
      }
    }
  }
};
