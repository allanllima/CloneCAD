import React from 'react';
import { Point2D, SnapResult } from '../core/types';

interface CADCrosshairProps {
  screenPos: Point2D;
  worldPos: Point2D;
  snap: SnapResult | null;
  activePrompt: string;
  showDynamicInput?: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export const CADCrosshair: React.FC<CADCrosshairProps> = ({
  screenPos,
  worldPos,
  snap,
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

      {/* Central Pickbox Square */}
      <div
        className="absolute border border-white/90 bg-transparent shadow-[0_0_2px_rgba(0,0,0,0.8)]"
        style={{
          width: `${pickboxSize}px`,
          height: `${pickboxSize}px`,
          left: `${screenPos.x - pickboxSize / 2}px`,
          top: `${screenPos.y - pickboxSize / 2}px`,
        }}
      />

      {/* OSNAP Marker Glyph */}
      {snap && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
          style={{
            left: `${screenPos.x}px`,
            top: `${screenPos.y}px`,
          }}
        >
          {snap.type === 'endpoint' && (
            <div className="w-3.5 h-3.5 border-2 border-[#2ecc71] bg-transparent" />
          )}
          {snap.type === 'midpoint' && (
            <div className="w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[12px] border-b-[#2ecc71]" />
          )}
          {snap.type === 'center' && (
            <div className="w-3.5 h-3.5 border-2 border-[#2ecc71] rounded-full" />
          )}
          {snap.type === 'nearest' && (
            <div className="text-[#2ecc71] text-xs font-bold leading-none select-none">⧖</div>
          )}
          {snap.type === 'grid' && (
            <div className="text-[#3498db] text-xs font-bold leading-none select-none">+</div>
          )}

          {/* Snap Tooltip */}
          <div className="absolute left-5 top-0 px-1.5 py-0.5 bg-[#181a1f]/90 border border-[#3a3f4b] text-[#2ecc71] text-[10px] font-mono rounded shadow whitespace-nowrap">
            {snap.description}
          </div>
        </div>
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
