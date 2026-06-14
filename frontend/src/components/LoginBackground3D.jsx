/**
 * LoginBackground3D — dynamic Three.js "Smart Farm AI" scene for /login.
 *
 * A tilted crop field whose stalks sway in the wind, an overhead mesh of
 * floating IoT/AI sensor nodes linked by glowing lines with scan beams down to
 * the field, a soft sun, and drifting pollen. Lightweight, pointer-events:none.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const FARM_GREEN = '#22c55e';
const EMERALD = '#34d399';
const SUN = '#fde68a';

/* ── Swaying crop field (instanced) ─────────────────────────────────── */
function Crops() {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rows = 14, cols = 22;
  const blades = useMemo(() => {
    const arr = [];
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = (i - cols / 2) * 0.95 + (Math.random() - 0.5) * 0.3;
        const z = -j * 1.0 - 1;
        arr.push({ x, z, h: 0.5 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
      }
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    blades.forEach((b, idx) => {
      dummy.position.set(b.x, b.h / 2 - 1.6, b.z);
      dummy.rotation.z = Math.sin(t * 1.6 + b.phase + b.x * 0.3) * 0.18;
      dummy.scale.set(1, b.h, 1);
      dummy.updateMatrix();
      ref.current.setMatrixAt(idx, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, rows * cols]}>
      <coneGeometry args={[0.06, 1, 5]} />
      <meshBasicMaterial color={FARM_GREEN} transparent opacity={0.85} />
    </instancedMesh>
  );
}

/* ── Field ground plane ─────────────────────────────────────────────── */
function Field() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, -7]}>
      <planeGeometry args={[40, 30]} />
      <meshBasicMaterial color="#064e3b" transparent opacity={0.55} />
    </mesh>
  );
}

/* ── Overhead IoT / AI sensor network ───────────────────────────────── */
function SensorNetwork() {
  const group = useRef();
  const nodes = useMemo(() => ([
    [-5, 2.4, -3], [-1.5, 3.1, -5], [2.5, 2.6, -4],
    [5, 3.2, -6], [0, 2.2, -2], [-3.5, 3.4, -7],
  ]), []);

  // Lines connecting nearby nodes (the "AI mesh")
  const linePositions = useMemo(() => {
    const pts = [];
    for (let i = 0; i < nodes.length; i++)
      for (let k = i + 1; k < nodes.length; k++) {
        const a = nodes[i], b = nodes[k];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        if (d < 6) pts.push(...a, ...b);
      }
    return new Float32Array(pts);
  }, [nodes]);

  // Scan beams from each node down to the field
  const beamPositions = useMemo(() => {
    const pts = [];
    nodes.forEach((n) => pts.push(n[0], n[1], n[2], n[0], -1.6, n[2]));
    return new Float32Array(pts);
  }, [nodes]);

  useFrame((state) => {
    if (group.current) group.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.12;
  });

  return (
    <group ref={group}>
      {/* network mesh lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={linePositions.length / 3} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={EMERALD} transparent opacity={0.35} />
      </lineSegments>
      {/* scan beams to the field */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={beamPositions.length / 3} array={beamPositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#a7f3d0" transparent opacity={0.18} />
      </lineSegments>
      {/* sensor nodes */}
      {nodes.map((n, i) => (
        <mesh key={i} position={n}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color={EMERALD} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Sun glow ───────────────────────────────────────────────────────── */
function Sun() {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) ref.current.material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
  });
  return (
    <group position={[6, 4.5, -10]}>
      <mesh>
        <sphereGeometry args={[1.1, 24, 24]} />
        <meshBasicMaterial color={SUN} transparent opacity={0.9} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color={SUN} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* ── Drifting pollen ────────────────────────────────────────────────── */
function Pollen({ count = 280 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = Math.random() * 8 - 1;
      arr[i * 3 + 2] = -Math.random() * 14;
    }
    return arr;
  }, [count]);
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.02;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={SUN} transparent opacity={0.6} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Rig() {
  useFrame((state) => {
    const x = (state.pointer.x || 0) * 1.2;
    const y = 1.2 + (state.pointer.y || 0) * 0.5;
    state.camera.position.x += (x - state.camera.position.x) * 0.03;
    state.camera.position.y += (y - state.camera.position.y) * 0.03;
    state.camera.lookAt(0, 0.3, -5);
  });
  return null;
}

export default function LoginBackground3D() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 1.2, 7], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={['#064e3b', 9, 26]} />
          <Field />
          <Crops />
          <SensorNetwork />
          <Sun />
          <Pollen />
          <Rig />
        </Suspense>
      </Canvas>
    </div>
  );
}
