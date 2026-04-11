import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, Html, ContactShadows, PresentationControls, Billboard } from '@react-three/drei';
import { useTranslation } from 'react-i18next';

function AnimalScene({ emoji, color, isActive }) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <Float
        speed={2} 
        rotationIntensity={1.5} 
        floatIntensity={2.5}
      >
        <PresentationControls
          global={false}
          cursor={true}
          snap={true}
          speed={2}
          zoom={1}
          rotation={[0, 0, 0]}
          polar={[-0.2, 0.2]}
          azimuth={[-0.4, 0.4]}
        >
          <Billboard>
            <Html
              center
              transform
              sprite
              distanceFactor={8}
              style={{
                userSelect: 'none',
                pointerEvents: 'none',
                fontSize: '80px',
                filter: isActive ? `drop-shadow(0 0 20px ${color})` : 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                transition: 'all 0.3s ease',
                transform: isActive ? 'scale(1.2)' : 'scale(1)',
              }}
            >
              {emoji}
            </Html>
          </Billboard>
        </PresentationControls>
      </Float>

      <ContactShadows 
        position={[0, -2.5, 0]} 
        opacity={0.4} 
        scale={8} 
        blur={2} 
        far={4.5} 
      />
    </>
  );
}

const ThreeSpeciesCard = ({ sp, count, emoji, color, isActive, onClick }) => {
  const { t } = useTranslation();
  return (
    <div 
      className={`summary-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ 
        height: '240px', 
        padding: '0', 
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 3D Canvas Layer */}
      <div style={{ width: '100%', height: '160px' }}>
        <Canvas camera={{ position: [0, 0, 8], fov: 40 }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <AnimalScene emoji={emoji} color={color} isActive={isActive} />
          </Suspense>
        </Canvas>
      </div>

      {/* Info Layer */}
      <div style={{ padding: '0 20px 20px', textAlign: 'center', zIndex: 1, pointerEvents: 'none' }}>
        <div className="summary-card-title">{t(`sidebar.${sp}`)}</div>
        <div className="summary-card-count">{count} {t('animals.population')}</div>
      </div>

      <div className="summary-card-accent" style={{ background: color }} />
    </div>
  );
};

export default ThreeSpeciesCard;
