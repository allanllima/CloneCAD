import React from 'react';
import { Point2D, SnapResult, SnapType } from '../core/types';

interface CADCrosshairProps {
  screenPos: Point2D;
  worldPos: Point2D;
  snap: SnapResult | null;
  snapScreenPos?: Point2D | null;
  activePrompt: string;
  showDynamicInput?: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

const neonGlow = 'drop-shadow(0 0 3px rgba(0,0,0,0.95)) drop-shadow(0 0 5px rgba(0,255,102,0.85))';

const SnapMarkerGlyph: React.FC<{ type: SnapType }> = ({ type }) => {
  switch (type) {
    case 'endpoint':
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="overflow-visible"
          style={{ filter: neonGlow }}
        >
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            fill="rgba(0, 255, 102, 0.25)"
            stroke="#00ff66"
            strokeWidth="2.5"
          />
        </svg>
      );
    case 'midpoint':
      return (
        <svg
          width="24"
          height="22"
          viewBox="0 0 24 22"
          className="overflow-visible"
          style={{ filter: neonGlow }}
        >
          <polygon
            points="12,2 22.5,20 1.5,20"
            fill="rgba(0, 255, 102, 0.25)"
            stroke="#00ff66"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'center':
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="overflow-visible"
          style={{ filter: neonGlow }}
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
            fill="rgba(0, 255, 102, 0.25)"
            stroke="#00ff66"
            strokeWidth="2.5"
          />
          <circle cx="12" cy="12" r="2.2" fill="#00ff66" />
        </svg>
      );
    case 'intersection':
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="overflow-visible"
          style={{ filter: neonGlow }}
        >
          <line x1="4" y1="4" x2="20" y2="20" stroke="#00ff66" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="20" y1="4" x2="4" y2="20" stroke="#00ff66" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );
    case 'perpendicular':
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="overflow-visible"
          style={{ filter: neonGlow }}
        >
          <polyline
            points="5,4 5,19 20,19"
            fill="none"
            stroke="#00ff66"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="5,11 13,11 13,19"
            fill="none"
            stroke="#00ff66"
            strokeWidth="1.8"
          />
        </svg>
      );
    case 'nearest':
      return (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          className="overflow-visible"
          style={{ filter: neonGlow }}
        >
          <polygon
            points="4,4 20,4 4,20 20,20"
            fill="rgba(0, 255, 102, 0.2)"
            stroke="#00ff66"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'grid':
      return (
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          className="overflow-visible"
          style={{
            filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.95)) drop-shadow(0 0 4px #38bdf8)',
          }}
        >
          <line x1="2" y1="10" x2="18" y2="10" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="10" y1="2" x2="10" y2="18" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <div className="w-3.5 h-3.5 border-2 border-[#00ff66] bg-[rgba(0,255,102,0.2)]" />
      );
  }
};

export const CADCrosshair: React.FC<CADCrosshairProps> = ({
  screenPos,
  worldPos,
  snap,
  snapScreenPos,
  activePrompt,
  showDynamicInput = true,
  viewportWidth,
  viewportHeight,
}) => {
  // If mouse is outside viewport, hide crosshair
  if (
    screenPos.x < 0 ||
    screenPos.x > viewportWidth ||
    screenPos.y < 0 ||
    screenPos.y > viewportHeight
  ) {
    return null;
  }

  const pickboxSize = 8; // 8px central pickbox
  const markerPos = snapScreenPos || screenPos;

  // Calculate magnetic attraction distance between cursor and snapped point
  const dx = markerPos.x - screenPos.x;
  const dy = markerPos.y - screenPos.y;
  const snapDist = Math.hypot(dx, dy);

  // Position tooltip relative to markerPos, preventing it from overflowing viewport
  const tooltipLeft =
    markerPos.x + 18 + 110 > viewportWidth
      ? markerPos.x - 110
      : markerPos.x + 18;
  const tooltipTop =
    markerPos.y - 12 < 10
      ? markerPos.y + 16
      : markerPos.y - 12;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {/* Full Screen Crosshair Horizontal Line */}
      <div
        className="absolute left-0 right-0 h-[1px] bg-white/40"
        style={{ top: `${screenPos.y}px` }}
      />

      {/* Full Screen Crosshair Vertical Line */}
      <div
        className="absolute top-0 bottom-0 w-[1px] bg-white/40"
        style={{ left: `${screenPos.x}px` }}
      />

      {/* Central Pickbox Square (Glows neon green when snap is locked) */}
      <div
        className={`absolute border transition-colors duration-100 ${
          snap
            ? 'border-[#00ff66] bg-[rgba(0,255,102,0.18)] shadow-[0_0_6px_#00ff66]'
            : 'border-white/90 bg-transparent shadow-[0_0_2px_rgba(0,0,0,0.8)]'
        }`}
        style={{
          width: `${pickboxSize}px`,
          height: `${pickboxSize}px`,
          left: `${screenPos.x - pickboxSize / 2}px`,
          top: `${screenPos.y - pickboxSize / 2}px`,
        }}
      />

      {/* Magnetic Attraction Tether Line (connects cursor pickbox to snapped geometry vertex) */}
      {snap && snapDist > 2 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible">
          <line
            x1={screenPos.x}
            y1={screenPos.y}
            x2={markerPos.x}
            y2={markerPos.y}
            stroke="#00ff66"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.85"
            style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}
          />
        </svg>
      )}

      {/* OSNAP Marker Glyph (Anchored directly on the snapped geometry vertex) */}
      {snap && (
        <>
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-transform duration-75"
            style={{
              left: `${markerPos.x}px`,
              top: `${markerPos.y}px`,
            }}
          >
            <SnapMarkerGlyph type={snap.type} />
          </div>

          {/* High-visibility Snap Tooltip Badge */}
          <div
            className="absolute pointer-events-none flex items-center gap-1.5 px-2 py-0.5 bg-[#14171d]/95 border border-[#00ff66]/80 text-[#00ff66] text-[11px] font-mono font-bold rounded shadow-[0_2px_8px_rgba(0,0,0,0.9)] whitespace-nowrap z-40 select-none tracking-wide"
            style={{
              left: `${tooltipLeft}px`,
              top: `${tooltipTop}px`,
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
            <span>{snap.description || snap.type.toUpperCase()}</span>
          </div>
        </>
      )}

      {/* Dynamic Input (AutoCAD DYN Mode floating tooltip) */}
      {showDynamicInput && (
        <div
          className="absolute z-20 flex flex-col gap-0.5 px-2 py-1 bg-[#1e2227]/90 border border-[#4b5263] text-white text-[11px] font-mono rounded shadow-lg pointer-events-none"
          style={{
            left: `${Math.min(screenPos.x + 18, viewportWidth - 140)}px`,
            top: `${Math.min(screenPos.y + 18, viewportHeight - 60)}px`,
          }}
        >
          <div className="flex gap-2">
            <span className="text-[#61afef]">X: {worldPos.x.toFixed(2)}</span>
            <span className="text-[#98c379]">Y: {worldPos.y.toFixed(2)}</span>
          </div>
          {activePrompt && activePrompt !== 'Command:' && (
            <div className="text-[#e5c07b] text-[10px] max-w-[200px] truncate">
              {activePrompt}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
