import React from 'react';
import { X, CheckCircle2, Cpu, RefreshCw, Layers, ShieldCheck, Box } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#21252b] border border-[#3a3f4b] rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col font-sans text-xs">
        {/* Header */}
        <div className="h-11 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Cpu size={18} className="text-[#61afef]" />
            <span>CloneCAD Architecture & Design Patterns Reference</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#abb2bf] hover:text-white p-1 rounded hover:bg-[#282c34]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-[#abb2bf] leading-relaxed">
          {/* Microkernel / Plugin Pattern */}
          <div className="bg-[#1b1e23] border border-[#3a3f4b] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#61afef] font-bold text-sm">
              <Layers size={16} />
              1. Microkernel / Plugin Architecture
            </div>
            <p>
              The <strong>CADCore</strong> serves as a clean, decoupled microkernel. It owns only the scene lifecycle,
              the world/screen coordinate system, command history stack, layer store, and WebGL rendering pipeline.
              <strong> Zero concrete drawing or modification tools are hardcoded into the Core</strong>.
            </p>
            <p>
              Every tool (<code>Line</code>, <code>Polyline</code>, <code>Circle</code>, <code>Rectangle</code>,
              <code>Arc</code>, <code>Text</code>, <code>Move</code>, <code>Copy</code>, <code>Rotate</code>,
              <code>Erase</code>, <code>Measure</code>) is implemented as an independent plugin adhering strictly to
              the <code>CADPlugin</code> contract:
            </p>
            <pre className="bg-[#181a1f] p-3 rounded border border-[#2c313a] text-[#98c379] font-mono text-[11px] overflow-x-auto">
{`export interface CADPlugin {
  id: string;
  name: string;
  version: string;
  category: 'draw' | 'modify' | 'annotation' | 'utility';
  init(core: CADCoreAPI): void;
  destroy?(): void;
}`}
            </pre>
          </div>

          {/* Command Pattern */}
          <div className="bg-[#1b1e23] border border-[#3a3f4b] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#98c379] font-bold text-sm">
              <RefreshCw size={16} />
              2. Command Pattern (Undo / Redo Engine)
            </div>
            <p>
              Every single modification to the drawing scene is encapsulated in an executable and reversible command
              implementing the <code>CADCommand</code> interface:
            </p>
            <pre className="bg-[#181a1f] p-3 rounded border border-[#2c313a] text-[#e5c07b] font-mono text-[11px] overflow-x-auto">
{`export interface CADCommand {
  id: string;
  name?: string;
  execute(): void;
  undo(): void;
}`}
            </pre>
            <p>
              Implemented commands include <code>AddEntityCommand</code>, <code>DeleteEntityCommand</code>,
              <code>TransformEntityCommand</code> (Move, Rotate, Scale), <code>ModifyEntityCommand</code> (Geometry & Colors),
              and <code>CompositeCommand</code> (Atomic multi-entity transactions).
            </p>
          </div>

          {/* Strategy / State Pattern */}
          <div className="bg-[#1b1e23] border border-[#3a3f4b] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#e5c07b] font-bold text-sm">
              <Box size={16} />
              3. Strategy / State Pattern (Interaction Modes)
            </div>
            <p>
              The user interaction state switches seamlessly via the <code>CADTool</code> strategy interface.
              The active tool responds to normalized pointer down, pointer move, pointer up, and keyboard events,
              providing real-time rubber-band previews and magnetic snap suggestions.
            </p>
          </div>

          {/* Graphic Engine & Bidirectional Coordinates */}
          <div className="bg-[#1b1e23] border border-[#3a3f4b] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-[#c678dd] font-bold text-sm">
              <ShieldCheck size={16} />
              4. Graphic Engine & Bidirectional Coordinates
            </div>
            <p>
              Built on <strong>Three.js 2D Orthographic WebGL</strong> with sub-pixel precision and hardware acceleration.
              Features bidirectional coordinate transformation between screen HTML pixels and continuous world CAD units:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#181a1f] p-2.5 rounded border border-[#2c313a]">
                <span className="text-[#61afef] font-semibold font-mono">Screen to World:</span>
                <p className="font-mono text-[10px] text-[#abb2bf] mt-1">
                  x = cameraX + (screenX - W/2) / zoom<br/>
                  y = cameraY - (screenY - H/2) / zoom
                </p>
              </div>
              <div className="bg-[#181a1f] p-2.5 rounded border border-[#2c313a]">
                <span className="text-[#98c379] font-semibold font-mono">World to Screen:</span>
                <p className="font-mono text-[10px] text-[#abb2bf] mt-1">
                  screenX = W/2 + (worldX - cameraX) * zoom<br/>
                  screenY = H/2 - (worldY - cameraY) * zoom
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#abb2bf] pt-1">
              Zoom operations compute the invariant world point under the cursor, recalculating camera coordinates to ensure
              flawless, cursor-centered zooming typical of industrial CAD software.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 bg-[#181a1f] border-t border-[#2c313a] flex items-center justify-end px-4">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#007acc] hover:bg-[#0098ff] text-white rounded font-medium text-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
