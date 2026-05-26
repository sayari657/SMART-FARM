import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls, Environment, ContactShadows, Float, PerspectiveCamera } from '@react-three/drei';

function Model({ url }) {
  const { scene } = useGLTF(url);
  const ref = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Gentle floating and subtle rotation for a cinematic feel
    ref.current.rotation.y = t / 10;
    ref.current.position.y = -0.5 + Math.sin(t / 2) / 10;
  });

  return <primitive ref={ref} object={scene} scale={2.2} position={[0, -0.5, 0]} />;
}

const ThreeFarmBackground = () => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      background: '#1a1a1a' // Dark background like the reference image
    }}>
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[45, 35, 1]} fov={40} />
        <Suspense fallback={null}>
          {/* Using "sunset" for vibrant, high-contrast colors */}
          <Environment preset="sunset" />

          <PresentationControls
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 6, Math.PI / 6]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
          >
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
              <Model url="https://raw.githubusercontent.com/sayari657/SMART-FARM/main/frontend/public/models/farm.glb" />
            </Float>
          </PresentationControls>

          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.4}
            scale={15}
            blur={2.5}
            far={1.5}
          />
        </Suspense>

        {/* Cinematic Lighting */}
        <ambientLight intensity={0.2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
      </Canvas>

      {/* Dark gradient overlay that blends into the green brand color at the edges */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(22, 163, 74, 0.4) 100%)',
        zIndex: 1
      }} />

      {/* Vignette effect for professional look */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        boxShadow: 'inset 0 0 15px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
        zIndex: 2
      }} />
    </div>
  );
};

export default ThreeFarmBackground;
