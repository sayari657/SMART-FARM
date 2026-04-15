import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import StableCanvas from './StableCanvas';

function Stars(props) {
  const ref = useRef();
  
  // Create random positions manually
  const sphere = useMemo(() => {
    const array = new Float32Array(15000);
    for (let i = 0; i < 15000; i++) {
        array[i] = (Math.random() - 0.5) * 4; // Spread them in a 3D box
    }
    return array;
  }, []);
  
  useFrame((state, delta) => {
    ref.current.rotation.x -= delta / 30;
    ref.current.rotation.y -= delta / 45;
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
      <StableCanvas camera={{ position: [0, 0, 1] }}>
        <Stars />
      </StableCanvas>
    </div>
  );
};

export default ThreeBackground;
