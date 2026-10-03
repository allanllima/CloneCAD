import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADLayer, CADTool } from '../core/types';
import {
  MousePointer,
  Minus,
  Spline,
  Circle,
  Square,
  Compass,
  Type,
  Move,
  Copy,
  RotateCw,
  Trash2,
  Ruler,
  Hand,
  Maximize2,
  Undo2,
  Redo2,
  Layers,
  Activity,
  CircleDashed,
  Hash,
  FlipHorizontal,
  Scissors,
  ArrowLeftRight,
  Grid as GridIcon,
  CornerUpRight,
  ChevronsRight,
  Split,
  Box,
  FolderPlus,
  Library,
  Sparkles,
  Table,
  Sliders,
  GitCommit,
  Printer,
  LayoutTemplate,
  Image as ImageIcon,
  Upload,
  Download,
  Terminal,
  Users,
  Zap,
} from 'lucide-react';

interface RibbonToolbarProps {
  core: CADCore;
  onOpenLayers: () => void;
  onOpenDesignCenter?: () => void;
  onOpenCreateBlock?: () => void;
  onOpenDimStyle?: () => void;
  onOpenDataExtraction?: () => void;
  onOpenPlot?: () => void;
  onOpenDXFImport?: () => void;
  onOpenRasterImage?: () => void;
}

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  core,
  onOpenLayers,
  onOpenDesignCenter,
  onOpenCreateBlock,
  onOpenDimStyle,
  onOpenDataExtraction,
  onOpenPlot,
  onOpenDXFImport,
  onOpenRasterImage,
}) => {
  const [activeToolId, setActiveToolId] = useState<string | null>(core.getActiveTool()?.id || 'select');
  const [layers, setLayers] = useState<CADLayer[]>(core.getLayers());
  const [activeLayer, setActiveLayer] = useState<CADLayer>(core.getActiveLayer());
  const [history, setHistory] = useState(core.getHistory());

  useEffect(() => {
    const unsubTool = core.on('tool:changed', (t: CADTool | null) => {
      setActiveToolId(t?.id || 'select');
    });

    const unsubLayers = core.on('layer:changed', () => {
      setLayers(core.getLayers());
      setActiveLayer(core.getActiveLayer());
    });

    const unsubHistory = core.on('history:changed', () => {
      setHistory(core.getHistory());
    });

    return () => {
      unsubTool();
      unsubLayers();
      unsubHistory();
    };
  }, [core]);

  const selectTool = (toolId: string) => {
    core.setActiveTool(toolId);
  };

  return (
    <div className="bg-[#21252b] border-b border-[#2c313a] flex items-stretch px-2 py-1.5 gap-2 select-none overflow-x-auto">
      {/* 1. SELECT & NAV PANEL */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectTool('select')}
            title="Select Tool (Esc)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'select'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <MousePointer size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Select</span>
          </button>
          <button
            onClick={() => selectTool('pan')}
            title="Pan Viewport (P)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'pan'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Hand size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Pan</span>
          </button>
          <button
            onClick={() => core.zoomExtents()}
            title="Zoom Extents (Z E)"
            className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0] min-w-[42px]"
          >
            <Maximize2 size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Extents</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Navigate
        </span>
      </div>

      {/* 2. DRAW PANEL */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectTool('line')}
            title="Line (L)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'line'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Minus size={18} className="transform rotate-45" />
            <span className="text-[10px] mt-0.5 font-medium">Line</span>
          </button>

          <button
            onClick={() => selectTool('polyline')}
            title="Polyline (PL)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'polyline'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Spline size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Polyline</span>
          </button>

          <button
            onClick={() => selectTool('circle')}
            title="Circle (C)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'circle'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Circle size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Circle</span>
          </button>

          <button
            onClick={() => selectTool('arc')}
            title="3-Point Arc (A)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'arc'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Compass size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Arc</span>
          </button>

          <button
            onClick={() => selectTool('rectangle')}
            title="Rectangle (REC)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'rectangle'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Square size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Rect</span>
          </button>

          <button
            onClick={() => selectTool('spline')}
            title="Spline (SPL)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'spline'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Activity size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Spline</span>
          </button>

          <button
            onClick={() => selectTool('ellipse')}
            title="Ellipse (EL)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'ellipse'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <CircleDashed size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Ellipse</span>
          </button>

          <button
            onClick={() => selectTool('hatch')}
            title="Hatch Pattern (H)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'hatch'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Hash size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Hatch</span>
          </button>

          <button
            onClick={() => selectTool('text')}
            title="Text (T)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'text'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Type size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Text</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Draw
        </span>
      </div>

      {/* 3. MODIFY PANEL */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectTool('move')}
            title="Move (M)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'move'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Move size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Move</span>
          </button>

          <button
            onClick={() => selectTool('copy')}
            title="Copy (CO)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'copy'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Copy size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Copy</span>
          </button>

          <button
            onClick={() => selectTool('rotate')}
            title="Rotate (RO)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'rotate'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <RotateCw size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Rotate</span>
          </button>

          <button
            onClick={() => selectTool('mirror')}
            title="Mirror (MI)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'mirror'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <FlipHorizontal size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Mirror</span>
          </button>

          <button
            onClick={() => selectTool('offset')}
            title="Offset (O)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'offset'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Split size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Offset</span>
          </button>

          <button
            onClick={() => selectTool('fillet')}
            title="Fillet (F)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'fillet'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <CornerUpRight size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Fillet</span>
          </button>

          <button
            onClick={() => selectTool('chamfer')}
            title="Chamfer (CHA)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'chamfer'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Minus size={18} className="transform -rotate-45" />
            <span className="text-[10px] mt-0.5 font-medium">Chamfer</span>
          </button>

          <button
            onClick={() => selectTool('trim')}
            title="Trim (TR)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'trim'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Scissors size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Trim</span>
          </button>

          <button
            onClick={() => selectTool('extend')}
            title="Extend (EX)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'extend'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <ChevronsRight size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Extend</span>
          </button>

          <button
            onClick={() => selectTool('stretch')}
            title="Stretch (S)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'stretch'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <ArrowLeftRight size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Stretch</span>
          </button>

          <button
            onClick={() => selectTool('array')}
            title="Array (AR)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'array'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <GridIcon size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Array</span>
          </button>

          <button
            onClick={() => selectTool('explode')}
            title="Explode (X)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'explode'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Sparkles size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Explode</span>
          </button>

          <button
            onClick={() => selectTool('erase')}
            title="Erase (E)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'erase'
                ? 'bg-[#e06c75] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e06c75]'
            }`}
          >
            <Trash2 size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Erase</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Modify
        </span>
      </div>

      {/* 4. BLOCK PANEL */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => (onOpenCreateBlock ? onOpenCreateBlock() : selectTool('block'))}
            title="Create Block (B)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'block'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Box size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Create</span>
          </button>

          <button
            onClick={() => selectTool('insert')}
            title="Insert Block (I)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'insert'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <FolderPlus size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Insert</span>
          </button>

          <button
            onClick={() => onOpenDesignCenter?.()}
            title="Design Center / Symbol Library (DC / ADCENTER)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[46px] hover:bg-[#282c34] text-[#61afef] hover:text-white"
          >
            <Library size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Library</span>
          </button>

          <button
            onClick={() => (onOpenRasterImage ? onOpenRasterImage() : core.openRasterImageModal())}
            title="Attach Raster Image (IMAGEATTACH)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] hover:bg-[#282c34] text-[#98c379] hover:text-white"
          >
            <ImageIcon size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Image</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Block & Image
        </span>
      </div>

      {/* 4. ANNOTATION / DIMENSIONS PANEL */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectTool('dimlinear')}
            title="Linear Dimension (DLI)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] ${
              activeToolId === 'dimlinear'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Ruler size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Linear</span>
          </button>

          <button
            onClick={() => selectTool('dimaligned')}
            title="Aligned Dimension (DAL)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] ${
              activeToolId === 'dimaligned'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <ArrowLeftRight size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Aligned</span>
          </button>

          <button
            onClick={() => selectTool('dimradius')}
            title="Radius Dimension (DRA)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] ${
              activeToolId === 'dimradius'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <CircleDashed size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Radius</span>
          </button>

          <button
            onClick={() => selectTool('dimdiameter')}
            title="Diameter Dimension (DDI)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] ${
              activeToolId === 'dimdiameter'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Circle size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Diam</span>
          </button>

          <button
            onClick={() => selectTool('dimangular')}
            title="Angular Dimension (DAN)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] ${
              activeToolId === 'dimangular'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <CornerUpRight size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Angular</span>
          </button>

          <button
            onClick={() => selectTool('mleader')}
            title="Multileader Annotation (ML / MLEADER)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] ${
              activeToolId === 'mleader'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <GitCommit size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Leader</span>
          </button>

          <button
            onClick={() => onOpenDimStyle?.()}
            title="Dimension Styles Manager (DIMSTYLE / D)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] hover:bg-[#282c34] text-[#61afef] hover:text-white"
          >
            <Sliders size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Style</span>
          </button>

          <button
            onClick={() => onOpenDataExtraction?.()}
            title="Data Extraction & BOM Quantitativos (DATAEXTRACTION)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] hover:bg-[#282c34] text-[#98c379] hover:text-white"
          >
            <Table size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Quant</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Dimensions & Annotate
        </span>
      </div>

      {/* 5. MEASURE / UTILITY / SCRIPT / COLLAB */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectTool('measure')}
            title="Measure Distance (DI)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[42px] ${
              activeToolId === 'measure'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <Ruler size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Measure</span>
          </button>

          <button
            onClick={() => core.openScriptEditorModal()}
            title="Script Editor & AutoLISP (SCR)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] hover:bg-[#282c34] text-[#61afef] hover:text-white"
          >
            <Terminal size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Script</span>
          </button>

          <button
            onClick={() => core.openCollaborationModal()}
            title="Real-Time Collaboration (COLLAB)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] hover:bg-[#282c34] text-[#98c379] hover:text-white"
          >
            <Users size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Collab</span>
          </button>

          <button
            onClick={() => core.openVersionControlModal()}
            title="Drawing History & Git Diff (VCS)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] hover:bg-[#282c34] text-[#c678dd] hover:text-white"
          >
            <GitCommit size={17} />
            <span className="text-[9px] mt-0.5 font-medium">Git Diff</span>
          </button>

          <button
            onClick={() => core.togglePerformanceHUD()}
            title="Monitor de Performance & WebGPU (HUD / FPS)"
            className="flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[38px] hover:bg-[#282c34] text-[#e5c07b] hover:text-white"
          >
            <Zap size={17} />
            <span className="text-[9px] mt-0.5 font-medium">GPU/HUD</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Utility & Automation
        </span>
      </div>

      {/* 5. LAYERS PANEL */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between min-w-[130px]">
        <div className="flex items-center gap-2 w-full pt-1">
          <div className="flex-1">
            <select
              value={activeLayer.id}
              onChange={(e) => core.setActiveLayer(e.target.value)}
              className="w-full bg-[#181a1f] border border-[#3a3f4b] text-[#e5e9f0] text-[11px] rounded px-1.5 py-0.5 outline-none font-mono"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onOpenLayers}
            title="Layer Properties Manager"
            className="p-1 rounded bg-[#282c34] hover:bg-[#353b45] text-[#abb2bf] hover:text-white"
          >
            <Layers size={16} />
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Layers
        </span>
      </div>

      {/* 6. HISTORY (UNDO/REDO) */}
      <div className="flex flex-col items-center border-r border-[#3a3f4b] pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => core.undo()}
            disabled={!core.canUndo()}
            title="Undo (Ctrl+Z)"
            className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0] disabled:opacity-30 min-w-[40px]"
          >
            <Undo2 size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Undo</span>
          </button>

          <button
            onClick={() => core.redo()}
            disabled={!core.canRedo()}
            title="Redo (Ctrl+Y)"
            className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0] disabled:opacity-30 min-w-[40px]"
          >
            <Redo2 size={18} />
            <span className="text-[10px] mt-0.5 font-medium">Redo</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          History
        </span>
      </div>

      {/* 7. OUTPUT & PLOT (PHASE 5) */}
      <div className="flex flex-col items-center pr-2 justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => selectTool('mview')}
            title="Create Viewport (MVIEW)"
            className={`flex flex-col items-center justify-center p-1.5 rounded transition-all min-w-[44px] ${
              activeToolId === 'mview'
                ? 'bg-[#007acc] text-white shadow-sm'
                : 'hover:bg-[#282c34] text-[#abb2bf] hover:text-[#e5e9f0]'
            }`}
          >
            <LayoutTemplate size={18} />
            <span className="text-[10px] mt-0.5 font-medium">MView</span>
          </button>

          <button
            onClick={() => (onOpenPlot ? onOpenPlot() : core.openPlotModal())}
            title="Plot to PDF (PLOT / Ctrl+P)"
            className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#282c34] text-[#00e5ff] hover:text-white min-w-[44px]"
          >
            <Printer size={18} />
            <span className="text-[10px] mt-0.5 font-medium font-bold">Plot</span>
          </button>

          <button
            onClick={() => (onOpenDXFImport ? onOpenDXFImport() : core.openDXFImportModal())}
            title="Import DXF / DWG (DXFIN)"
            className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#282c34] text-[#61afef] hover:text-white min-w-[44px]"
          >
            <Upload size={18} />
            <span className="text-[10px] mt-0.5 font-medium">DXF In</span>
          </button>

          <button
            onClick={() => core.downloadDXF()}
            title="Export DXF AutoCAD R2000 (DXFOUT)"
            className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#282c34] text-[#e5c07b] hover:text-white min-w-[44px]"
          >
            <Download size={18} />
            <span className="text-[10px] mt-0.5 font-medium">DXF Out</span>
          </button>
        </div>
        <span className="text-[9px] uppercase tracking-wider text-[#5c6370] font-semibold mt-1">
          Output & DXF
        </span>
      </div>
    </div>
  );
};
