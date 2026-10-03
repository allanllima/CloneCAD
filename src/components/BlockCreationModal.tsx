import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADEntity, Point2D } from '../core/types';
import { X, Box, Check, MousePointer } from 'lucide-react';
import { BlockTool } from '../plugins/block/BlockPlugin';

interface BlockCreationModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const BlockCreationModal: React.FC<BlockCreationModalProps> = ({
  core,
  isOpen,
  onClose,
}) => {
  const [blockName, setBlockName] = useState('');
  const [basePoint, setBasePoint] = useState<Point2D>({ x: 0, y: 0 });
  const [selectedEntities, setSelectedEntities] = useState<CADEntity[]>([]);
  const [convertToInstance, setConvertToInstance] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const selected = core.getSelectedEntities();
      setSelectedEntities(selected);
      setBlockName(`BLOCK_${Date.now().toString().slice(-4)}`);

      if (selected.length > 0) {
        // Calculate approximate centroid of selected entities as default base point
        let sumX = 0, sumY = 0, count = 0;
        for (const ent of selected) {
          if (ent.type === 'line') {
            const l = ent as any;
            sumX += l.start.x + l.end.x;
            sumY += l.start.y + l.end.y;
            count += 2;
          } else if (ent.type === 'circle' || ent.type === 'arc') {
            const c = ent as any;
            sumX += c.center.x; sumY += c.center.y; count++;
          } else if (ent.type === 'rectangle') {
            const r = ent as any;
            sumX += r.origin.x; sumY += r.origin.y; count++;
          } else if (ent.type === 'insert') {
            const ins = ent as any;
            sumX += ins.position.x; sumY += ins.position.y; count++;
          }
        }
        if (count > 0) {
          setBasePoint({ x: Math.round(sumX / count), y: Math.round(sumY / count) });
        }
      }
    }
  }, [isOpen, core]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockName.trim()) return;

    if (selectedEntities.length === 0) {
      alert('Please select at least one entity in the drawing to define a block.');
      return;
    }

    const blockTool = core.getTools().find((t) => t.id === 'block') as BlockTool;
    if (blockTool) {
      blockTool.createBlockFromSelection(
        blockName.trim(),
        basePoint,
        selectedEntities,
        convertToInstance
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[440px] max-w-[95vw] bg-[#21252b] border border-[#3e4451] rounded shadow-2xl flex flex-col font-sans text-xs text-[#abb2bf] overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Box size={16} className="text-[#007acc]" />
            <span>Block Definition — AutoCAD Standard</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#abb2bf] hover:text-white rounded hover:bg-[#282c34]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-4 space-y-4">
          {/* Block Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#e5e9f0]">Name:</label>
            <input
              type="text"
              required
              autoFocus
              value={blockName}
              onChange={(e) => setBlockName(e.target.value.toUpperCase())}
              placeholder="e.g. PORTA_80, MESA_6LUG, DETALHE_1"
              className="w-full bg-[#181a1f] border border-[#3e4451] rounded px-3 py-1.5 text-white font-mono uppercase outline-none focus:border-[#007acc]"
            />
          </div>

          {/* Base Point */}
          <div className="bg-[#181a1f] p-3 rounded border border-[#2c313a] space-y-2">
            <div className="flex justify-between items-center text-[11px] font-semibold text-[#61afef]">
              <span>Base Point (Insertion Origin)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#5c6370] block">X Coordinate:</label>
                <input
                  type="number"
                  step="0.01"
                  value={basePoint.x}
                  onChange={(e) => setBasePoint({ ...basePoint, x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#21252b] border border-[#3e4451] rounded px-2 py-1 text-white font-mono text-right outline-none focus:border-[#007acc]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#5c6370] block">Y Coordinate:</label>
                <input
                  type="number"
                  step="0.01"
                  value={basePoint.y}
                  onChange={(e) => setBasePoint({ ...basePoint, y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#21252b] border border-[#3e4451] rounded px-2 py-1 text-white font-mono text-right outline-none focus:border-[#007acc]"
                />
              </div>
            </div>
          </div>

          {/* Selected Objects Info */}
          <div className="bg-[#181a1f] p-3 rounded border border-[#2c313a] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-[#e5e9f0]">Selected Entities</div>
              <div className="text-[10px] text-[#5c6370]">
                {selectedEntities.length} object(s) selected
              </div>
            </div>
            <div className="text-right font-mono text-sm text-[#98c379] font-bold">
              {selectedEntities.length > 0 ? `${selectedEntities.length} OK` : 'None'}
            </div>
          </div>

          {/* Convert to block instance checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] text-[#e5e9f0]">
            <input
              type="checkbox"
              checked={convertToInstance}
              onChange={(e) => setConvertToInstance(e.target.checked)}
              className="rounded bg-[#181a1f] border-[#3e4451] text-[#007acc] focus:ring-0"
            />
            <span>Convert selected entities to block reference</span>
          </label>

          {/* Buttons */}
          <div className="pt-2 border-t border-[#2c313a] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-[#282c34] text-[#abb2bf]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedEntities.length === 0 || !blockName.trim()}
              className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0098ff] disabled:opacity-50 disabled:pointer-events-none text-white rounded font-semibold transition-colors"
            >
              Create Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
