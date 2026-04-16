import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import StableCanvas from './StableCanvas';

function Stars(props) {
  const ref = useRef();
  
  // SOLVED: THREE.BufferGeometry.computeBoundingSphere() NaN error
  // The array size must be a multiple of the item size (3 for x,y,z).
  // 4500 / 3 = 1500 points
  const sphere = useMemo(() => {
    const count = 1500;
    const array = new Float32Array(count * 3); 
    for (let i = 0; i < count * 3; i++) {
        array[i] = (Math.random() - 0.5) * 5; 
    }
    return array;
  }, []);
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 30;
      ref.current.rotation.y -= delta / 45;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled {...props}>
        <PointMaterial
          transparent
          color="#16a34a"
          size={0.015}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

const ThreeBackground = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
      pointerEvents: 'none'
    }}>
      <StableCanvas camera={{ position: [0, 0, 1] }} gl={{ antialias: false, powerPreference: 'low-power' }}>
        <Stars />
      </StableCanvas>
    </div>
  );
};

export default ThreeBackground;
