import { useEntities } from 'miniplex-react'
import { queries, world } from '../engine/ecs'
import { SlashingVFX, ArrowVFX, AirSwordVFX, SpawnWarningVFX, DamageTextVFX, GoldCoinVFX } from './VFXLibrary'

/**
 * VFXManager: 特效指挥中心
 * 职责：监听 ECS 中的特效实体，并分发渲染
 */
export function VFXManager() {
  const { entities: effectEntities } = useEntities(queries.effects)
  const { entities: damageEntities } = useEntities(queries.damageDigits)
  const { entities: allEntities } = useEntities(world)

  return (
    <>
      {/* 自动分组并分发给对应的实例化渲染器 */}
      <SlashingVFX entities={effectEntities.filter(e => e.effect?.type === 'slash')} />
      <ArrowVFX entities={effectEntities.filter(e => e.effect?.type === 'arrow')} />
      <AirSwordVFX entities={effectEntities.filter(e => e.effect?.type === 'air_sword')} />
      <GoldCoinVFX entities={effectEntities.filter(e => e.effect?.type === 'gold_coin')} />
      
      {/* 伤害飘字渲染器 */}
      <DamageTextVFX entities={damageEntities} />
      
      {/* 出生预警特效：监听所有带有 spawnTimer 的实体 */}
      <SpawnWarningVFX entities={allEntities.filter(e => e.spawnTimer !== undefined && e.spawnTimer > 0)} />
    </>
  )
}
