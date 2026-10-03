import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CADCore } from '../core/CADCore';
import { Point2D, SnapResult } from '../core/types';
import { CADCrosshair, DynamicInputState } from './CADCrosshair';

interface CADViewportProps {
  core: CADCore;
  showDynamicInput?: boolean;
}

export const CADViewport: React.FC<CADViewportProps> = ({ core, showDynamicInput = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [screenPos, setScreenPos] = useState<Point2D>({ x: -100, y: -100 });
  const [worldPos, setWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [basePoint, setBasePoint] = useState<Point2D | null>(core.getActiveBasePoint());
  const [currentSnap, setCurrentSnap] = useState<SnapResult | null>(null);
  const [prompt, setPrompt] = useState<string>(core.getPrompt());
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  const [dynInput, setDynInput] = useState<DynamicInputState>({
    active: false,
    field: 'distance',
    distVal: '',
    angleVal: '',
    xVal: '',
    yVal: '',
  });

  const resetDynInput = useCallback(() => {
    setDynInput({
      active: false,
      field: 'distance',
      distVal: '',
      angleVal: '',
      xVal: '',
      yVal: '',
    });
  }, []);

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

    const unsubPrompt = core.on('prompt:changed', (p) => {
      setPrompt(p);
      setBasePoint(core.getActiveBasePoint());
      resetDynInput();
    });

    const unsubPoint = core.on('point:entered', () => {
      setBasePoint(core.getActiveBasePoint());
      resetDynInput();
    });

    return () => {
      resizeObserver.disconnect();
      unsubPrompt();
      unsubPoint();
      core.detachRenderer();
    };
  }, [core, resetDynInput]);

  // Global keydown handler with Dynamic Input support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focus is inside an input/textarea
      const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (showDynamicInput) {
        // 1. Enter: commit coordinate
        if (e.key === 'Enter') {
          if (dynInput.active) {
            e.preventDefault();
            const activeBase = core.getActiveBasePoint();
            if (activeBase) {
              const dx = worldPos.x - activeBase.x;
              const dy = worldPos.y - activeBase.y;
              const liveDist = Math.hypot(dx, dy);
              let liveAng = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

              // If user only typed distance and left angle blank: Direct Distance Entry!
              if (dynInput.distVal !== '' && dynInput.angleVal === '') {
                core.inputCoordinate(dynInput.distVal, worldPos);
              } else {
                const dist = dynInput.distVal !== '' ? dynInput.distVal : liveDist.toFixed(2);
                const ang = dynInput.angleVal !== '' ? dynInput.angleVal : liveAng.toFixed(1);
                core.inputCoordinate(`@${dist}<${ang}`);
              }
            } else {
              const x = dynInput.xVal !== '' ? dynInput.xVal : worldPos.x.toFixed(2);
              const y = dynInput.yVal !== '' ? dynInput.yVal : worldPos.y.toFixed(2);
              core.inputCoordinate(`${x},${y}`);
            }
            resetDynInput();
            return;
          }
        }

        // 2. Tab: toggle between fields
        if (e.key === 'Tab') {
          e.preventDefault();
          const activeBase = core.getActiveBasePoint();
          if (activeBase) {
            setDynInput((prev) => {
              const nextField = prev.field === 'distance' ? 'angle' : 'distance';
              const dx = worldPos.x - activeBase.x;
              const dy = worldPos.y - activeBase.y;
              const liveDist = Math.hypot(dx, dy);
              const distVal = prev.distVal !== '' ? prev.distVal : liveDist.toFixed(2);
              return {
                ...prev,
                active: true,
                field: nextField,
                distVal,
              };
            });
          } else {
            setDynInput((prev) => ({
              ...prev,
              active: true,
              field: prev.field === 'cartesianX' ? 'cartesianY' : 'cartesianX',
              xVal: prev.xVal !== '' ? prev.xVal : worldPos.x.toFixed(2),
            }));
          }
          return;
        }

        // 3. '<' (less than): switch to angle field in polar mode
        if (e.key === '<') {
          const activeBase = core.getActiveBasePoint();
          if (activeBase) {
            e.preventDefault();
            setDynInput((prev) => {
              const dx = worldPos.x - activeBase.x;
              const dy = worldPos.y - activeBase.y;
              const liveDist = Math.hypot(dx, dy);
              const distVal = prev.distVal !== '' ? prev.distVal : liveDist.toFixed(2);
              return {
                ...prev,
                active: true,
                field: 'angle',
                distVal,
              };
            });
            return;
          }
        }

        // 4. ',' (comma): switch to Y field in Cartesian mode
        if (e.key === ',') {
          const activeBase = core.getActiveBasePoint();
          if (!activeBase) {
            e.preventDefault();
            setDynInput((prev) => ({
              ...prev,
              active: true,
              field: 'cartesianY',
              xVal: prev.xVal !== '' ? prev.xVal : worldPos.x.toFixed(2),
            }));
            return;
          }
        }

        // 5. Backspace: delete character in active dynamic input
        if (e.key === 'Backspace' && dynInput.active) {
          e.preventDefault();
          setDynInput((prev) => {
            const targetKey =
              prev.field === 'distance'
                ? 'distVal'
                : prev.field === 'angle'
                ? 'angleVal'
                : prev.field === 'cartesianX'
                ? 'xVal'
                : 'yVal';
            const nextStr = prev[targetKey].slice(0, -1);
            const stillActive =
              nextStr !== '' ||
              prev.distVal !== '' ||
              prev.angleVal !== '' ||
              prev.xVal !== '' ||
              prev.yVal !== '';
            return {
              ...prev,
              active: stillActive,
              [targetKey]: nextStr,
            };
          });
          return;
        }

        // 6. Escape: cancel dynamic input if active
        if (e.key === 'Escape' && dynInput.active) {
          e.preventDefault();
          resetDynInput();
          return;
        }

        // 7. Numbers and decimal point: activate dynamic input and append digit
        if (/^[0-9.\-]$/.test(e.key)) {
          e.preventDefault();
          setDynInput((prev) => {
            const activeBase = core.getActiveBasePoint();
            const defaultField = activeBase ? 'distance' : 'cartesianX';
            const currentField = prev.active ? prev.field : defaultField;
            const targetKey =
              currentField === 'distance'
                ? 'distVal'
                : currentField === 'angle'
                ? 'angleVal'
                : currentField === 'cartesianX'
                ? 'xVal'
                : 'yVal';
            return {
              ...prev,
              active: true,
              field: currentField,
              [targetKey]: prev[targetKey] + e.key,
            };
          });
          return;
        }
      }

      // Default: pass key event to core (e.g. F8, F3, F10, F11, F12, Undo, Redo, etc.)
      core.handleKeyDown(e);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [core, showDynamicInput, dynInput, worldPos, resetDynInput]);

  const getScreenCoordinates = useCallback((e: React.MouseEvent): Point2D => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dynInput.active) {
      resetDynInput();
    }
    const screen = getScreenCoordinates(e);
    core.handlePointerDown(e.nativeEvent, screen.x, screen.y);
    setBasePoint(core.getActiveBasePoint());
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const screen = getScreenCoordinates(e);
    setScreenPos(screen);

    const world = core.screenToWorld(screen.x, screen.y);
    const snap = core.snapPoint(world, screen);
    setCurrentSnap(snap);

    const finalWorld = snap ? snap.point : world;
    setWorldPos(finalWorld);
    setBasePoint(core.getActiveBasePoint());

    core.handlePointerMove(e.nativeEvent, screen.x, screen.y);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const screen = getScreenCoordinates(e);
    core.handlePointerUp(e.nativeEvent, screen.x, screen.y);
    setBasePoint(core.getActiveBasePoint());
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

  const snapScreenPos = currentSnap ? core.worldToScreen(currentSnap.point) : null;

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
        basePoint={basePoint}
        snap={currentSnap}
        snapScreenPos={snapScreenPos}
        activePrompt={prompt}
        showDynamicInput={showDynamicInput}
        dynInput={dynInput}
        viewportWidth={dimensions.width}
        viewportHeight={dimensions.height}
      />
    </div>
  );
};
