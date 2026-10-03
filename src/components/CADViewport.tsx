import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CADCore } from '../core/CADCore';
import { Point2D, SnapResult } from '../core/types';
import { CADCrosshair } from './CADCrosshair';

interface CADViewportProps {
  core: CADCore;
  showDynamicInput?: boolean;
}

export const CADViewport: React.FC<CADViewportProps> = ({ core, showDynamicInput = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [screenPos, setScreenPos] = useState<Point2D>({ x: -100, y: -100 });
  const [worldPos, setWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [currentSnap, setCurrentSnap] = useState<SnapResult | null>(null);
  const [prompt, setPrompt] = useState<string>(core.getPrompt());
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  // Attach Three.js Renderer on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    core.attachRenderer(container);

    const updateSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.max(10, Math.floor(rect.width));
      const h = Math.max(10, Math.floor(rect.height));
      setDimensions({ width: w, height: h });
      core.resize(w, h);
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    const unsubPrompt = core.on('prompt:changed', (p) => setPrompt(p));

    return () => {
      resizeObserver.disconnect();
      unsubPrompt();
      core.detachRenderer();
    };
  }, [core]);

  // Global keydown handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is inside an input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      core.handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [core]);

  const getScreenCoordinates = useCallback((e: React.MouseEvent): Point2D => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const screen = getScreenCoordinates(e);
    core.handlePointerDown(e.nativeEvent, screen.x, screen.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const screen = getScreenCoordinates(e);
    setScreenPos(screen);

    const world = core.screenToWorld(screen.x, screen.y);
    const snap = core.snapPoint(world, screen);
    setCurrentSnap(snap);

    const finalWorld = snap ? snap.point : world;
    setWorldPos(finalWorld);

    core.handlePointerMove(e.nativeEvent, screen.x, screen.y);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const screen = getScreenCoordinates(e);
    core.handlePointerUp(e.nativeEvent, screen.x, screen.y);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const screen = getScreenCoordinates(e);
    core.handleWheel(e.nativeEvent, screen.x, screen.y);
  };

  const handleMouseLeave = () => {
    setScreenPos({ x: -100, y: -100 });
    setCurrentSnap(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden cad-canvas-container bg-[#21252b] select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          const file = e.dataTransfer.files[0];
          if (file.name.toLowerCase().endsWith('.dxf') || file.name.toLowerCase().endsWith('.dwg')) {
            core.openDXFImportModal();
          } else if (/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
            core.openRasterImageModal();
          }
        }
      }}
      tabIndex={0}
    >
      <CADCrosshair
        screenPos={screenPos}
        worldPos={worldPos}
        snap={currentSnap}
        activePrompt={prompt}
        showDynamicInput={showDynamicInput}
        viewportWidth={dimensions.width}
        viewportHeight={dimensions.height}
      />
    </div>
  );
};
