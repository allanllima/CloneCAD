import React, { useState } from 'react';
import { CADCore } from '../core/CADCore';
import { CADBlockDefinition } from '../core/types';
import {
  X,
  Search,
  Box,
  Layers,
  ArrowRight,
  FolderOpen,
  Plus,
  Compass,
  Zap,
  Wrench,
  Tag,
} from 'lucide-react';

interface DesignCenterModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateModal: () => void;
}

export const DesignCenterModal: React.FC<DesignCenterModalProps> = ({
  core,
  isOpen,
  onClose,
  onOpenCreateModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<CADBlockDefinition | null>(null);

  if (!isOpen) return null;

  const allBlocks = core.getBlockDefinitions();

  const categories = [
    { id: 'all', label: 'All Symbols', icon: Box },
    { id: 'architecture', label: 'Architecture', icon: FolderOpen },
    { id: 'civil', label: 'Civil', icon: Compass },
    { id: 'electrical', label: 'Electrical', icon: Zap },
    { id: 'mechanical', label: 'Mechanical', icon: Wrench },
    { id: 'symbols', label: 'Annotation', icon: Tag },
    { id: 'custom', label: 'Drawing Blocks', icon: Layers },
  ];

  const filteredBlocks = allBlocks.filter((b) => {
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleInsert = (block: CADBlockDefinition) => {
    const insertTool = core.getTools().find((t) => t.id === 'insert') as any;
    if (insertTool && typeof insertTool.setBlockName === 'function') {
      insertTool.setBlockName(block.name);
    }
    core.setActiveTool('insert');
    onClose();
  };

  /**
   * Helper to render mini SVG thumbnail preview of the block's entities
   */
  const renderThumbnail = (block: CADBlockDefinition) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const ent of block.entities) {
      if (ent.type === 'line') {
        const l = ent as any;
        minX = Math.min(minX, l.start.x, l.end.x);
        maxX = Math.max(maxX, l.start.x, l.end.x);
        minY = Math.min(minY, l.start.y, l.end.y);
        maxY = Math.max(maxY, l.start.y, l.end.y);
      } else if (ent.type === 'circle') {
        const c = ent as any;
        minX = Math.min(minX, c.center.x - c.radius);
        maxX = Math.max(maxX, c.center.x + c.radius);
        minY = Math.min(minY, c.center.y - c.radius);
        maxY = Math.max(maxY, c.center.y + c.radius);
      } else if (ent.type === 'rectangle') {
        const r = ent as any;
        minX = Math.min(minX, r.origin.x);
        maxX = Math.max(maxX, r.origin.x + r.width);
        minY = Math.min(minY, r.origin.y);
        maxY = Math.max(maxY, r.origin.y + r.height);
      } else if (ent.type === 'arc') {
        const a = ent as any;
        minX = Math.min(minX, a.center.x - a.radius);
        maxX = Math.max(maxX, a.center.x + a.radius);
        minY = Math.min(minY, a.center.y - a.radius);
        maxY = Math.max(maxY, a.center.y + a.radius);
      } else if (ent.type === 'ellipse') {
        const el = ent as any;
        minX = Math.min(minX, el.center.x - el.radiusX);
        maxX = Math.max(maxX, el.center.x + el.radiusX);
        minY = Math.min(minY, el.center.y - el.radiusY);
        maxY = Math.max(maxY, el.center.y + el.radiusY);
      }
    }

    if (minX === Infinity) {
      minX = -20; maxX = 20; minY = -20; maxY = 20;
    }

    const pad = 12;
    const w = Math.max(20, (maxX - minX) + pad * 2);
    const h = Math.max(20, (maxY - minY) + pad * 2);
    const viewBox = `${minX - pad} ${-(maxY + pad)} ${w} ${h}`;

    return (
      <svg
        viewBox={viewBox}
        className="w-full h-24 bg-[#181a1f] rounded border border-[#2c313a] p-1"
      >
        {block.entities.map((ent, idx) => {
          const col = '#61afef';
          if (ent.type === 'line') {
            const l = ent as any;
            return (
              <line
                key={idx}
                x1={l.start.x}
                y1={-l.start.y}
                x2={l.end.x}
                y2={-l.end.y}
                stroke={col}
                strokeWidth="1.5"
              />
            );
          } else if (ent.type === 'circle') {
            const c = ent as any;
            return (
              <circle
                key={idx}
                cx={c.center.x}
                cy={-c.center.y}
                r={c.radius}
                stroke={col}
                strokeWidth="1.5"
                fill="none"
              />
            );
          } else if (ent.type === 'rectangle') {
            const r = ent as any;
            return (
              <rect
                key={idx}
                x={r.origin.x}
                y={-(r.origin.y + r.height)}
                width={r.width}
                height={r.height}
                stroke={col}
                strokeWidth="1.5"
                fill="none"
              />
            );
          } else if (ent.type === 'arc') {
            const a = ent as any;
            const x1 = a.center.x + Math.cos(a.startAngle) * a.radius;
            const y1 = -(a.center.y + Math.sin(a.startAngle) * a.radius);
            const x2 = a.center.x + Math.cos(a.endAngle) * a.radius;
            const y2 = -(a.center.y + Math.sin(a.endAngle) * a.radius);
            let sweep = a.endAngle - a.startAngle;
            if (sweep < 0) sweep += Math.PI * 2;
            const largeArc = sweep > Math.PI ? 1 : 0;
            const d = `M ${x1} ${y1} A ${a.radius} ${a.radius} 0 ${largeArc} 0 ${x2} ${y2}`;
            return <path key={idx} d={d} stroke={col} strokeWidth="1.5" fill="none" />;
          } else if (ent.type === 'ellipse') {
            const el = ent as any;
            return (
              <ellipse
                key={idx}
                cx={el.center.x}
                cy={-el.center.y}
                rx={el.radiusX}
                ry={el.radiusY}
                stroke={col}
                strokeWidth="1.5"
                fill="none"
              />
            );
          }
          return null;
        })}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[840px] max-w-[95vw] h-[580px] bg-[#21252b] border border-[#3e4451] rounded shadow-2xl flex flex-col font-sans text-xs text-[#abb2bf] overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Box size={16} className="text-[#007acc]" />
            <span>Design Center — AutoCAD Symbol Library & Blocks</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCreateModal();
              }}
              className="h-7 px-2.5 flex items-center gap-1.5 bg-[#007acc] hover:bg-[#0098ff] text-white rounded font-medium transition-colors"
            >
              <Plus size={14} />
              <span>Create Block (B)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-[#abb2bf] hover:text-white rounded hover:bg-[#282c34]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2 bg-[#1b1e23] border-b border-[#2c313a] flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-[#5c6370]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks by name or description (e.g. DOOR, OUTLET, BEAM)..."
              className="w-full bg-[#21252b] border border-[#3e4451] rounded pl-8 pr-3 py-1.5 text-white placeholder-[#5c6370] outline-none focus:border-[#007acc]"
            />
          </div>
          <span className="text-[11px] text-[#5c6370]">
            {filteredBlocks.length} block(s) available
          </span>
        </div>

        {/* Body (Sidebar + Content + Details) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-48 bg-[#181a1f] border-r border-[#2c313a] p-2 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5c6370] px-2 py-1">
              Libraries
            </div>
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-left transition-colors ${
                    isSelected
                      ? 'bg-[#007acc] text-white font-semibold shadow-sm'
                      : 'text-[#abb2bf] hover:bg-[#282c34] hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Block Grid */}
          <div className="flex-1 p-4 overflow-y-auto bg-[#21252b]">
            <div className="grid grid-cols-3 gap-3">
              {filteredBlocks.map((block) => {
                const isSelected = selectedBlock?.id === block.id;
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    onDoubleClick={() => handleInsert(block)}
                    className={`p-2.5 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#007acc] bg-[#282c34] shadow-md ring-1 ring-[#007acc]'
                        : 'border-[#3a3f4b] bg-[#1e2227] hover:border-[#61afef]'
                    }`}
                  >
                    <div>
                      {renderThumbnail(block)}
                      <div className="mt-2 font-mono font-semibold text-white text-xs truncate">
                        {block.name}
                      </div>
                      <div className="text-[10px] text-[#5c6370] line-clamp-1 mt-0.5">
                        {block.description || 'Parametric Symbol'}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#2c313a] flex items-center justify-between">
                      <span className="text-[10px] text-[#98c379] font-mono">
                        {block.entities.length} ents
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInsert(block);
                        }}
                        className="h-6 px-2 bg-[#007acc] hover:bg-[#0098ff] text-white rounded text-[10px] font-bold flex items-center gap-1"
                      >
                        <span>Insert</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredBlocks.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[#5c6370]">
                <Box size={36} className="mb-2 opacity-50" />
                <p>No blocks found in this category.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="h-9 bg-[#181a1f] border-t border-[#2c313a] px-4 flex items-center justify-between text-[11px] text-[#5c6370]">
          <span>Double-click a block or click "Insert" to place in drawing.</span>
          <span>Shortcut: <kbd className="px-1 py-0.5 bg-[#282c34] rounded text-white font-mono">I</kbd> or <kbd className="px-1 py-0.5 bg-[#282c34] rounded text-white font-mono">DC</kbd></span>
        </div>
      </div>
    </div>
  );
};
