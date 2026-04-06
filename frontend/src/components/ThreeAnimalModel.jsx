import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls, Environment, ContactShadows, Float } from '@react-three/drei';

function Model({ url, scale = 1, rotation = [0, 0, 0] }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={scale} rotation={rotation} />;
}

const ThreeAnimalModel = ({ modelUrl, scale = 1.5, rotation = [0, 0, 0] }) => {
  return (
    <div style={{ width: '100%', height: '200px', position: 'relative' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 4], fov: 40 }}>
        <Suspense fallback={null}>
          <Environment preset="city" />
          <PresentationControls
            global={false}
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, 0, 0]}
            polar={[-Math.PI / 6, Math.PI / 6]}
            azimuth={[-Math.PI / 3, Math.PI / 3]}
          >
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
              <Stage intensity={0.5} contactShadow={false} adjustCamera={true} environment="city">
                 <Model url={modelUrl} scale={scale} rotation={rotation} />
              </Stage>
            </Float>
          </PresentationControls>
          <ContactShadows 
            position={[0, -1, 0]} 
            opacity={0.3} 
            scale={5} 
            blur={2} 
            far={1.5} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ThreeAnimalModel;
