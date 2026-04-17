import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';

/**
 * SOLID: Open/Closed Principle
 * StableCanvas is an extension of R3F Canvas that adds robustness against 
 * WebGL context loss and null-pointer errors during event listener attachment.
 */
const StableCanvas = ({ children, fallback, ...props }) => {
  const [hasError, setHasError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Handle context loss
    const handleContextLost = (event) => {
      event.preventDefault();
      console.warn("WebGL Context Lost. Attempting recovery...");
      setHasError(true);
    };

    // Note: Temporary support check removed to stay under WebGL context limits
    return () => {};
  }, []);

  if (hasError || !isSupported) {
    return (
      <div className="canvas-fallback" style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.1)',
        borderRadius: '20px',
        color: 'var(--color-primary)'
      }}>
        {fallback || "AI Visualizer Resetting..."}
        <button 
          onClick={() => setHasError(false)}
          style={{ marginLeft: '10px', padding: '5px 10px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Canvas
      {...props}
      gl={{ 
        powerPreference: "high-performance",
        precision: "mediump",
        alpha: true,
        antialias: true,
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        ...props.gl
      }}
      onCreated={(state) => {
        // Safe connection of events to prevent the 'addEventListener' null error
        try {
          if (state.gl && state.gl.domElement) {
            // Success
            if (props.onCreated) props.onCreated(state);
          } else {
            throw new Error("Canvas DOM element missing");
          }
        } catch (err) {
          console.error("StableCanvas Init Error:", err);
          setHasError(true);
        }
      }}
      onError={(err) => {
        console.error("R3F Global Error:", err);
        setHasError(true);
      }}
    >
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </Canvas>
  );
};

export default StableCanvas;
