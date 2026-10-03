import React, { useState, useRef, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import {
  FileText,
  Edit,
  Eye,
  PenTool,
  Wrench,
  HelpCircle,
  Download,
  Upload,
  RotateCcw,
  RotateCw,
  FolderOpen,
  Info,
  Printer,
} from 'lucide-react';

interface TopMenuBarProps {
  core: CADCore;
  onOpenLayers: () => void;
  onOpenArchitecture: () => void;
  onOpenDesignCenter?: () => void;
  onOpenCreateBlock?: () => void;
  onOpenDimStyle?: () => void;
  onOpenDataExtraction?: () => void;
  onOpenPlot?: () => void;
  onLoadSample: (sampleType: 'mechanical' | 'architectural') => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  core,
  onOpenLayers,
  onOpenArchitecture,
  onOpenDesignCenter,
  onOpenCreateBlock,
  onOpenDimStyle,
  onOpenDataExtraction,
  onOpenPlot,
  onLoadSample,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportJSON = () => {
    const data = {
      version: '1.0',
      entities: core.getEntities(),
      layers: core.getLayers(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clonecad_drawing_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    core.logCommandMessage('Drawing exported as JSON.');
  };

  const handleExportSVG = () => {
    const ents = core.getEntities();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ent of ents) {
      const b = (core as any).selection.getEntityBounds(ent);
      if (b) {
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
    }

    if (minX === Infinity) {
      alert('Drawing is empty.');
      return;
    }

    const pad = 20;
    const width = (maxX - minX) + pad * 2;
    const height = (maxY - minY) + pad * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - pad} ${-maxY - pad} ${width} ${height}" style="background-color: #21252b;">\n`;
    for (const ent of ents) {
      const col = ent.color || '#ffffff';
      if (ent.type === 'line') {
        const l = ent as any;
        svg += `  <line x1="${l.start.x}" y1="${-l.start.y}" x2="${l.end.x}" y2="${-l.end.y}" stroke="${col}" stroke-width="1.5" />\n`;
      } else if (ent.type === 'circle') {
        const c = ent as any;
        svg += `  <circle cx="${c.center.x}" cy="${-c.center.y}" r="${c.radius}" stroke="${col}" stroke-width="1.5" fill="none" />\n`;
      } else if (ent.type === 'rectangle') {
        const r = ent as any;
        svg += `  <rect x="${r.origin.x}" y="${-(r.origin.y + r.height)}" width="${r.width}" height="${r.height}" stroke="${col}" stroke-width="1.5" fill="none" />\n`;
      }
    }
    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clonecad_export_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    core.logCommandMessage('Drawing exported as SVG.');
  };

  const handleSelectAll = () => {
    const ids = core.getEntities().map((e) => e.id);
    core.selectEntities(ids, false);
    core.logCommandMessage(`SELECT ALL: ${ids.length} object(s) selected.`);
  };

  return (
    <div
      ref={menuBarRef}
      className="h-8 bg-[#181a1f] border-b border-[#2c313a] flex items-center px-2 text-xs font-sans text-[#abb2bf] select-none z-40 relative"
    >
      {/* Brand Icon & Name */}
      <div className="flex items-center gap-2 pr-4 border-r border-[#2c313a] mr-2">
        <div className="w-5 h-5 bg-[#007acc] rounded flex items-center justify-center text-white font-bold text-xs tracking-tighter">
          C
        </div>
        <span className="font-bold text-[#e5e9f0] tracking-wide text-xs">CloneCAD</span>
        <span className="text-[10px] text-[#5c6370] hidden sm:inline">2026 Classic Dark</span>
      </div>

      {/* Menu items */}
      <div className="flex items-center space-x-1">
        {/* FILE MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'file' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  onLoadSample('architectural');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2"
              >
                <FolderOpen size={14} />
                Load Sample Floorplan
              </button>
              <button
                onClick={() => {
                  onLoadSample('mechanical');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2"
              >
                <FolderOpen size={14} />
                Load Mechanical Part
              </button>
              <div className="border-t border-[#3a3f4b] my-1" />
              <button
                onClick={() => {
                  handleExportJSON();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2"
              >
                <Download size={14} />
                Export Drawing (JSON)
              </button>
              <button
                onClick={() => {
                  handleExportSVG();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2"
              >
                <Download size={14} />
                Export as SVG Vector
              </button>
              <div className="border-t border-[#3a3f4b] my-1" />
              <button
                onClick={() => {
                  if (onOpenPlot) onOpenPlot();
                  else core.openPlotModal();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Printer size={14} className="text-[#00e5ff]" />
                  Plot / Print to PDF...
                </div>
                <span className="text-[10px] text-gray-400">Ctrl+P</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'edit' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.undo();
                  setOpenMenu(null);
                }}
                disabled={!core.canUndo()}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between disabled:opacity-40"
              >
                <span>Undo</span>
                <span className="text-[#5c6370] text-[10px]">Ctrl+Z</span>
              </button>
              <button
                onClick={() => {
                  core.redo();
                  setOpenMenu(null);
                }}
                disabled={!core.canRedo()}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between disabled:opacity-40"
              >
                <span>Redo</span>
                <span className="text-[#5c6370] text-[10px]">Ctrl+Y</span>
              </button>
              <div className="border-t border-[#3a3f4b] my-1" />
              <button
                onClick={() => {
                  handleSelectAll();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Select All</span>
                <span className="text-[#5c6370] text-[10px]">Ctrl+A</span>
              </button>
              <button
                onClick={() => {
                  core.clearSelection();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Deselect All</span>
                <span className="text-[#5c6370] text-[10px]">Esc</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'view' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.zoomExtents();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
              >
                Zoom Extents (Z E)
              </button>
              <button
                onClick={() => {
                  core.setViewport({ cameraX: 0, cameraY: 0, zoom: 1.0 });
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
              >
                Reset Camera (Origin)
              </button>
            </div>
          )}
        </div>

        {/* DRAW MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'draw' ? null : 'draw')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'draw' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            Draw
          </button>
          {openMenu === 'draw' && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.setActiveTool('line');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Line</span> <span className="text-[#5c6370]">L</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('polyline');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Polyline</span> <span className="text-[#5c6370]">PL</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('circle');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Circle</span> <span className="text-[#5c6370]">C</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('rectangle');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Rectangle</span> <span className="text-[#5c6370]">REC</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('arc');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Arc</span> <span className="text-[#5c6370]">A</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('spline');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Spline</span> <span className="text-[#5c6370]">SPL</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('ellipse');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Ellipse</span> <span className="text-[#5c6370]">EL</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('hatch');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Hatch</span> <span className="text-[#5c6370]">H</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('text');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Text</span> <span className="text-[#5c6370]">T</span>
              </button>
            </div>
          )}
        </div>

        {/* MODIFY MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'modify' ? null : 'modify')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'modify' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            Modify
          </button>
          {openMenu === 'modify' && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.setActiveTool('move');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Move</span> <span className="text-[#5c6370]">M</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('copy');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Copy</span> <span className="text-[#5c6370]">CO</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('rotate');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Rotate</span> <span className="text-[#5c6370]">RO</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('mirror');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Mirror</span> <span className="text-[#5c6370]">MI</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('offset');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Offset</span> <span className="text-[#5c6370]">O</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('fillet');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Fillet</span> <span className="text-[#5c6370]">F</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('chamfer');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Chamfer</span> <span className="text-[#5c6370]">CHA</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('trim');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Trim</span> <span className="text-[#5c6370]">TR</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('extend');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Extend</span> <span className="text-[#5c6370]">EX</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('stretch');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Stretch</span> <span className="text-[#5c6370]">S</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('array');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Array</span> <span className="text-[#5c6370]">AR</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('explode');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Explode</span> <span className="text-[#5c6370]">X</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('erase');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Erase</span> <span className="text-[#5c6370]">E</span>
              </button>
            </div>
          )}
        </div>

        {/* BLOCKS MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'blocks' ? null : 'blocks')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'blocks' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            Blocks
          </button>
          {openMenu === 'blocks' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.setActiveTool('insert');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Insert Block...</span> <span className="text-[#5c6370]">I</span>
              </button>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  if (onOpenCreateBlock) onOpenCreateBlock();
                  else core.setActiveTool('block');
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Define Block...</span> <span className="text-[#5c6370]">B</span>
              </button>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenDesignCenter?.();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between text-[#61afef]"
              >
                <span>Design Center Library</span> <span className="text-[#5c6370]">DC</span>
              </button>
            </div>
          )}
        </div>

        {/* DIMENSIONS MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'dimensions' ? null : 'dimensions')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'dimensions' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            Dimensions
          </button>
          {openMenu === 'dimensions' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.setActiveTool('dimlinear');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Linear Dimension</span> <span className="text-[#5c6370]">DLI</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('dimaligned');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Aligned Dimension</span> <span className="text-[#5c6370]">DAL</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('dimradius');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Radius Dimension</span> <span className="text-[#5c6370]">DRA</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('dimdiameter');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Diameter Dimension</span> <span className="text-[#5c6370]">DDI</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('dimangular');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Angular Dimension</span> <span className="text-[#5c6370]">DAN</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('dimordinate');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Ordinate Dimension</span> <span className="text-[#5c6370]">DOR</span>
              </button>
              <button
                onClick={() => {
                  core.setActiveTool('mleader');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Multileader Note</span> <span className="text-[#5c6370]">ML</span>
              </button>
              <div className="border-t border-[#3a3f4b] my-1" />
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenDimStyle?.();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between text-[#61afef]"
              >
                <span>Dimension Style...</span> <span className="text-[#5c6370]">DIMSTYLE</span>
              </button>
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onOpenDataExtraction?.();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between text-[#98c379]"
              >
                <span>Data Extraction (BOM)...</span> <span className="text-[#5c6370]">DX</span>
              </button>
            </div>
          )}
        </div>

        {/* TOOLS MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
            className={`px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-white transition-colors ${
              openMenu === 'tools' ? 'bg-[#282c34] text-white' : ''
            }`}
          >
            Tools
          </button>
          {openMenu === 'tools' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-[#21252b] border border-[#3a3f4b] rounded shadow-2xl py-1 z-50 text-[12px]">
              <button
                onClick={() => {
                  core.setActiveTool('measure');
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex justify-between"
              >
                <span>Measure Distance</span> <span className="text-[#5c6370]">DI</span>
              </button>
              <button
                onClick={() => {
                  onOpenLayers();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#007acc] hover:text-white"
              >
                Layer Properties...
              </button>
            </div>
          )}
        </div>

        {/* ARCHITECTURE & HELP */}
        <div className="relative">
          <button
            onClick={() => {
              onOpenArchitecture();
              setOpenMenu(null);
            }}
            className="px-2.5 py-1 rounded hover:bg-[#282c34] hover:text-[#61afef] transition-colors flex items-center gap-1.5 text-[#61afef] font-semibold"
          >
            <Info size={13} />
            Architecture & Design Patterns
          </button>
        </div>
      </div>
    </div>
  );
};
