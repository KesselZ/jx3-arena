import { useEntities } from 'miniplex-react'
import { queries } from '../engine/ecs'
import { SlashingVFX, ArrowVFX, AirSwordVFX } from './VFXLibrary'

/**
 * VFXManager: 特效指挥中心
 * 职责：监听 ECS 中的特效实体，并分发渲染
 */
export function VFXManager() {
  const { entities } = useEntities(queries.effects)

  return (
    <>
      {/* 自动分组并分发给对应的实例化渲染器 */}
      <SlashingVFX entities={entities.filter(e => e.effect?.type === 'slash')} />
      <ArrowVFX entities={entities.filter(e => e.effect?.type === 'arrow')} />
      <AirSwordVFX entities={entities.filter(e => e.effect?.type === 'air_sword')} />
    </>
  )
}
