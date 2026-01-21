import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { Assets, UNITS } from '../assets/assets';

/**
 * 1. 3D 渲染组件 (React Three Fiber)
 */
export function PixelSprite({ unitId, scale = 1, flipX = false }: {
  unitId: keyof typeof UNITS;
  scale?: number;
  flipX?: boolean;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const unit = UNITS[unitId];

  useEffect(() => {
    Assets.getTexture(unitId).then(setTexture);
  }, [unitId]);

  if (!texture) return null;

  // 计算偏移和翻转
  const finalScaleX = unit.facing === 'left' ? (flipX ? scale : -scale) : (flipX ? -scale : scale);
  const yOffset = unit.anchor === 'bottom' ? 0.5 : 0;

  return (
    <mesh position={[0, yOffset, 0]} scale={[finalScaleX, scale, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial map={texture} transparent={true} side={THREE.DoubleSide} alphaTest={0.5} />
    </mesh>
  );
}

/**
 * 2. UI 图标组件 (Tailwind/DOM)
 */
export function SpriteIcon({ unitId, size = 48, className = "" }: {
  unitId: keyof typeof UNITS;
  size?: number;
  className?: string;
}) {
  const style = Assets.getCSS(unitId);
  return (
    <div 
      className={`inline-block pixelated ${className}`}
      style={{ ...style, width: size, height: size }}
    />
  );
}
