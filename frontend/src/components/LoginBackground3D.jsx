/**
 * LoginBackground3D — dynamic Three.js backdrop for the /login left panel.
 * Smart Farm AI theme: a drifting particle field (spores / data points) around
 * a slowly rotating wireframe "AI core". Lightweight, pointer-events:none.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Particles({ count = 900 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Spread in a sphere shell for depth
      const r = 4 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.04;
    ref.current.rotation.x += delta * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color="#6ee7b7" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function AICore() {
  const ref = useRef();
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.25;
    ref.current.rotation.z += delta * 0.06;
    const s = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[2.2, 1]} />
      <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.5} />
    </mesh>
  );
}

function FloatingOrbs() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.1;
  });
  const orbs = useMemo(() => ([
    { p: [3.5, 1.5, -2], c: '#818cf8', s: 0.35 },
    { p: [-3, -2, 1], c: '#a78bfa', s: 0.28 },
    { p: [2, -3, 2], c: '#34d399', s: 0.22 },
    { p: [-2.5, 2.5, -1], c: '#22d3ee', s: 0.18 },
  ]), []);
  return (
    <group ref={ref}>
      {orbs.map((o, i) => (
        <mesh key={i} position={o.p}>
          <sphereGeometry args={[o.s, 16, 16]} />
          <meshBasicMaterial color={o.c} transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}

function Rig() {
  // Subtle parallax following the pointer
  useFrame((state) => {
    const x = (state.pointer.x || 0) * 0.6;
    const y = (state.pointer.y || 0) * 0.4;
    state.camera.position.x += (x - state.camera.position.x) * 0.03;
    state.camera.position.y += (y - state.camera.position.y) * 0.03;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function LoginBackground3D() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 11], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#312e81', 8, 22]} />
          <AICore />
          <Particles />
          <FloatingOrbs />
          <Rig />
        </Suspense>
      </Canvas>
    </div>
  );
}
