import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Assets, UNITS } from '../assets/assets';

/**
 * 1. 3D 渲染组件 (React Three Fiber)
 * 支持程序化行走动画：跳动和倾斜
 */
export function PixelSprite({ 
  unitId, 
  scale = 1, 
  flipX = false,
  velocity = { x: 0, y: 0, z: 0 },
  lastHitTime = 0
}: {
  unitId: keyof typeof UNITS;
  scale?: number;
  flipX?: boolean;
  velocity?: { x: number, y: number, z: number };
  lastHitTime?: number;
}) {
  const [assetData, setAssetData] = useState<{ texture: THREE.Texture, width: number, height: number } | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const unit = UNITS[unitId];

  useEffect(() => {
    Assets.getTexture(unitId).then(setAssetData);
  }, [unitId]);

  // 解决 HD-2D 光照冲突的最优选：法线锁定
  // 无论 Mesh 怎么为了面向相机而旋转，我们都让光照系统认为它的面是朝向世界坐标正前方的
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.onBeforeCompile = (shader) => {
        // 方案 A：数学模拟“圆柱体法线”
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec2 vCustomUv;
          `
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <beginnormal_vertex>',
          `
          #include <beginnormal_vertex>
          vCustomUv = uv;
          `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
          #include <common>
          varying vec2 vCustomUv;
          `
        );

        // 核心修正：在系统初始化 normal 之后再进行覆盖
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <view_normal_fragment_begin>',
          `
          #include <view_normal_fragment_begin>
          
          // 计算伪 3D 法线 (圆柱体模拟)
          // vCustomUv.x 0.5 时朝前，边缘向两侧弯曲
          float bend = (vCustomUv.x - 0.5) * 2.0; 
          float nz = sqrt(max(0.0, 1.0 - bend * bend));
          vec3 nx = vec3(bend, 0.0, nz);
          
          // 强行覆盖法线，并锁定在视图空间，确保光照不随相机旋转而跳变
          normal = normalize(normalMatrix * nx);
          `
        );
      };
      materialRef.current.needsUpdate = true;
    }
  }, [assetData]);

  // 程序化动画逻辑
  useFrame((state) => {
    if (!groupRef.current) return;

    const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
    const mesh = groupRef.current.getObjectByName('pixel-sprite-mesh') as THREE.Mesh;
    if (!mesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    
    // 1. 受击闪白逻辑
    const hitDuration = 0.1; 
    const isHit = state.clock.elapsedTime - lastHitTime < hitDuration;
    
    if (isHit) {
      material.emissive.set('#ffffff');
      material.emissiveIntensity = 1;
      material.color.set('#ffffff');
    } else {
      material.emissive.set('#000000');
      material.emissiveIntensity = 0;
      material.color.set('#ffffff'); 
    }

    material.roughness = 0.7; // 稍微保留一点质感
    material.metalness = 0;

    // 2. 行走/静止动画逻辑
    if (speed > 0.1) {
      // 行走中的动画：基于时间的正弦波
      const t = state.clock.elapsedTime;
      // 动画频率与移动速度挂钩
      const freq = speed * 4;
      // 跳动：y 轴微跳
      const bounce = Math.abs(Math.sin(t * freq)) * 0.1 * scale;
      // 倾斜：行走方向的微小旋转
      const tilt = Math.sin(t * freq) * 0.05;
      
      mesh.position.y = (scale / 2) + bounce;
      mesh.rotation.z = tilt;
    } else {
      // 停止时的平滑复位
      mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, scale / 2, 0.1);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, 0, 0.1);
    }
  });

  if (!assetData) return null;

  const aspectRatio = assetData.width / assetData.height;
  const meshHeight = scale;
  const meshWidth = scale * aspectRatio;

  // 这里的 flipX 仅作为初始状态，真正的实时翻转由外部在 useFrame 中通过直接修改 scale.x 实现
  const initialScaleX = flipX ? -1 : 1;
  
  return (
    <group ref={groupRef}>
      <mesh 
        name="pixel-sprite-mesh" 
        position={[0, meshHeight / 2, 0]} 
        scale={[initialScaleX, 1, 1]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[meshWidth, meshHeight]} />
        <meshStandardMaterial 
          ref={materialRef}
          map={assetData.texture} 
          transparent={true} 
          side={THREE.DoubleSide} 
          alphaTest={0.5} 
        />
        {/* 关键：自定义深度材质，确保阴影符合像素轮廓 */}
        <meshDepthMaterial 
          attach="customDepthMaterial" 
          map={assetData.texture} 
          alphaTest={0.5} 
          depthPacking={THREE.RGBADepthPacking} 
        />
      </mesh>
    </group>
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
