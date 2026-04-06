import React, { useState } from 'react';

const ThreeTile = ({ children, className = '' }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const card = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - card.left) / card.width - 0.5) * 20; // 20deg max
    const y = ((e.clientY - card.top) / card.height - 0.5) * -20;
    setRotate({ x, y });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div 
      className={`three-tile ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: '1000px',
        width: '100%',
        height: '100%'
      }}
    >
      <div 
        style={{
          width: '100%',
          height: '100%',
          transition: 'transform 0.1s ease-out',
          transform: `rotateX(${rotate.y}deg) rotateY(${rotate.x}deg) scale(1.02)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div style={{ transform: 'translateZ(20px)', height: '100%' }}>
          {children}
        </div>
        
        {/* Dynamic Light Overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: `radial-gradient(circle at ${(rotate.x + 20) * 2.5}% ${(rotate.y + 20) * 1.5}%, rgba(255,255,255,0.15) 0%, transparent 80%)`,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          zIndex: 5
        }} />
      </div>
    </div>
  );
};

export default ThreeTile;
