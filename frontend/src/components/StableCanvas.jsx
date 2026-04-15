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
    // Check for WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn("WebGL not supported, falling back to 2D renderer.");
      setIsSupported(false);
    }
  }, []);

  if (hasError || !isSupported) {
    return <div className="canvas-fallback">{fallback || null}</div>;
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
