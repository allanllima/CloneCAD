import React, { useState, useEffect, useRef } from 'react';
import { CADCore } from '../core/CADCore';

interface CommandLineProps {
  core: CADCore;
  onOpenDesignCenter?: () => void;
  onOpenCreateBlock?: () => void;
  onOpenDimStyle?: () => void;
  onOpenDataExtraction?: () => void;
}

export const CommandLine: React.FC<CommandLineProps> = ({
  core,
  onOpenDesignCenter,
  onOpenCreateBlock,
  onOpenDimStyle,
  onOpenDataExtraction,
}) => {
  const [history, setHistory] = useState<string[]>([
    'CloneCAD Modular Engine [Version 2.0.26]',
    '(c) 2026 CloneCAD Architecture. All rights reserved.',
    'AutoCAD Dark UI Loaded. Microkernel core initialized.',
    'Type "HELP" or command name (e.g. "LINE", "CIRCLE", "M", "E", "B", "I", "X").',
  ]);
  const [inputVal, setInputVal] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('Command:');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    const unsubMsg = core.on('message:logged', (msg: string) => {
      setHistory((prev) => [...prev, msg]);
    });

    const unsubPrompt = core.on('prompt:changed', (p: string) => {
      setCurrentPrompt(p || 'Command:');
    });

    return () => {
      unsubMsg();
      unsubPrompt();
    };
  }, [core]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inputVal.trim();
    if (!raw) return;

    // Log the typed command
    setHistory((prev) => [...prev, `${currentPrompt} ${raw}`]);
    setCommandHistory((prev) => [...prev, raw]);
    setHistoryIndex(-1);
    setInputVal('');

    processCommand(raw);
  };

  const processCommand = (cmdStr: string) => {
    const upper = cmdStr.toUpperCase();
    const parts = cmdStr.split(/\s+/);
    const cmd = parts[0].toUpperCase();

    // Check for coordinate entry (e.g., "100,50" or "100.5, 20.3")
    if (cmdStr.includes(',')) {
      const coords = cmdStr.split(',').map((s) => parseFloat(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        const screen = core.worldToScreen(coords[0], coords[1]);
        const mouseEvt = new MouseEvent('mousedown', { clientX: screen.x, clientY: screen.y, button: 0 });
        core.handlePointerDown(mouseEvt, screen.x, screen.y);
        core.logCommandMessage(`Point entered: (${coords[0]}, ${coords[1]})`);
        return;
      }
    }

    switch (cmd) {
      // Draw commands
      case 'L':
      case 'LINE':
        core.setActiveTool('line');
        break;

      case 'PL':
      case 'PLINE':
        core.setActiveTool('polyline');
        break;

      case 'C':
      case 'CIRCLE':
        core.setActiveTool('circle');
        break;

      case 'REC':
      case 'RECT':
      case 'RECTANGLE':
        core.setActiveTool('rectangle');
        break;

      case 'A':
      case 'ARC':
        core.setActiveTool('arc');
        break;

      case 'SPL':
      case 'SPLINE':
        core.setActiveTool('spline');
        break;

      case 'EL':
      case 'ELLIPSE':
        core.setActiveTool('ellipse');
        break;

      case 'H':
      case 'HATCH':
        core.setActiveTool('hatch');
        break;

      case 'T':
      case 'TEXT':
      case 'MTEXT':
        core.setActiveTool('text');
        break;

      // Modify commands
      case 'E':
      case 'ERASE':
      case 'DELETE':
        core.setActiveTool('erase');
        break;

      case 'M':
      case 'MOVE':
        core.setActiveTool('move');
        break;

      case 'CO':
      case 'CP':
      case 'COPY':
        core.setActiveTool('copy');
        break;

      case 'RO':
      case 'ROTATE':
        core.setActiveTool('rotate');
        break;

      case 'MI':
      case 'MIRROR':
        core.setActiveTool('mirror');
        break;

      case 'O':
      case 'OFFSET':
        core.setActiveTool('offset');
        break;

      case 'F':
      case 'FILLET':
        core.setActiveTool('fillet');
        break;

      case 'CHA':
      case 'CHAMFER':
        core.setActiveTool('chamfer');
        break;

      case 'TR':
      case 'TRIM':
        core.setActiveTool('trim');
        break;

      case 'EX':
      case 'EXTEND':
        core.setActiveTool('extend');
        break;

      case 'S':
      case 'STRETCH':
        core.setActiveTool('stretch');
        break;

      case 'AR':
      case 'ARRAY':
        core.setActiveTool('array');
        break;

      case 'X':
      case 'EXPLODE':
        core.setActiveTool('explode');
        break;

      // Block commands
      case 'B':
      case 'BLOCK':
        if (onOpenCreateBlock) {
          onOpenCreateBlock();
        } else {
          core.setActiveTool('block');
        }
        break;

      case 'I':
      case 'INSERT':
        core.setActiveTool('insert');
        break;

      case 'DC':
      case 'ADCENTER':
      case 'DESIGNCENTER':
        if (onOpenDesignCenter) {
          onOpenDesignCenter();
        } else {
          core.logCommandMessage('Design Center not available.');
        }
        break;

      case 'ATTEDIT':
        {
          const selected = core.getSelectedEntities();
          const insertEnt = selected.find((e) => e.type === 'insert');
          if (insertEnt) {
            core.emit('block:open_attributes_modal', insertEnt);
          } else {
            core.logCommandMessage('ATTEDIT: Select a block reference entity first.');
          }
        }
        break;

      // Dimension commands (Phase 4)
      case 'DLI':
      case 'DIMLIN':
      case 'DIMLINEAR':
        core.setActiveTool('dimlinear');
        break;

      case 'DAL':
      case 'DIMALIGNED':
        core.setActiveTool('dimaligned');
        break;

      case 'DRA':
      case 'DIMRAD':
      case 'DIMRADIUS':
        core.setActiveTool('dimradius');
        break;

      case 'DDI':
      case 'DIMDIAM':
      case 'DIMDIAMETER':
        core.setActiveTool('dimdiameter');
        break;

      case 'DAN':
      case 'DIMANG':
      case 'DIMANGULAR':
        core.setActiveTool('dimangular');
        break;

      case 'DOR':
      case 'DIMORD':
      case 'DIMORDINATE':
        core.setActiveTool('dimordinate');
        break;

      case 'ML':
      case 'MLEADER':
      case 'LEADER':
        core.setActiveTool('mleader');
        break;

      case 'D':
      case 'DST':
      case 'DIMSTYLE':
        if (onOpenDimStyle) onOpenDimStyle();
        else core.emit('dimstyle:open_modal');
        break;

      case 'DX':
      case 'DATAEXTRACTION':
      case 'BCOUNT':
      case 'QUANT':
        if (onOpenDataExtraction) onOpenDataExtraction();
        else core.emit('data_extraction:open_modal');
        break;

      // Phase 5: Layouts, Paper Space & Plotting
      case 'PLOT':
      case 'PRINT':
      case 'PAGESETUP':
        core.openPlotModal();
        break;

      case 'MV':
      case 'MVIEW':
        core.setActiveTool('mview');
        break;

      case 'PSPACE':
      case 'PS':
        if (core.getLayouts().length > 0) {
          core.setActiveSpace(core.getLayouts()[0].id);
        }
        break;

      case 'MSPACE':
      case 'MS':
      case 'MODEL':
        core.setActiveSpace('model');
        break;

      case 'LAYOUT':
        if (parts[1]) {
          const sub = parts[1].toUpperCase();
          if (sub === 'NEW' || sub === 'N') {
            const l = core.createLayout({ name: parts.slice(2).join(' ') || undefined });
            core.setActiveSpace(l.id);
          } else if (sub === 'SET' || sub === 'S') {
            const target = core.getLayouts().find((x) => x.name.toUpperCase() === parts[2]?.toUpperCase() || x.id === parts[2]);
            if (target) core.setActiveSpace(target.id);
          }
        } else {
          core.openPlotModal();
        }
        break;

      // Interoperability & Raster Images (Phase 6)
      case 'DXFIN':
      case 'IMPORT':
      case 'DXFIMPORT':
        core.openDXFImportModal();
        break;

      case 'DXFOUT':
      case 'DXF':
      case 'EXPORT':
      case 'DXFEXPORT':
        core.downloadDXF();
        break;

      case 'IMAGE':
      case 'IMAGEATTACH':
      case 'ATTACHIMAGE':
      case 'IMAGEADJUST':
        core.openRasterImageModal();
        break;

      // Scripting, Collab & Version Control (Phase 7)
      case 'SCR':
      case 'SCRIPT':
      case 'LISP':
        core.openScriptEditorModal();
        break;

      case 'COLLAB':
      case 'MULTIPLAYER':
      case 'SHARE':
        core.openCollaborationModal();
        break;

      case 'COMMIT':
      case 'GIT':
      case 'VCS':
      case 'BRANCH':
      case 'DIFF':
        core.openVersionControlModal();
        break;

      // Navigation & View
      case 'P':
      case 'PAN':
        core.setActiveTool('pan');
        break;

      case 'Z':
      case 'ZOOM':
        if (parts[1]?.toUpperCase() === 'E' || parts[1]?.toUpperCase() === 'EXTENTS') {
          core.zoomExtents();
          core.logCommandMessage('ZOOM Extents');
        } else {
          core.zoomExtents();
          core.logCommandMessage('ZOOM Extents applied.');
        }
        break;

      case 'DI':
      case 'DIST':
      case 'MEASURE':
        core.setActiveTool('measure');
        break;

      // History
      case 'U':
      case 'UNDO':
        if (!core.undo()) {
          core.logCommandMessage('Already at oldest change.');
        }
        break;

      case 'REDO':
        if (!core.redo()) {
          core.logCommandMessage('Already at newest change.');
        }
        break;

      // Drafting settings
      case 'ORTHO':
        core.setOrthoMode(!core.isOrthoMode());
        break;

      case 'POLAR':
        if (parts[1] && !isNaN(Number(parts[1]))) {
          core.setPolarIncrement(Number(parts[1]));
          core.setPolarTracking(true);
        } else {
          core.setPolarTracking(!core.isPolarTracking());
        }
        break;

      case 'OTRACK':
        core.setOTrack(!core.isOTrack());
        break;

      case 'OSNAP':
        {
          const s = core.getSnapSettings();
          core.setSnapSettings({ enabled: !s.enabled });
          core.logCommandMessage(`OSNAP: ${!s.enabled ? 'ON' : 'OFF'}`);
        }
        break;

      case 'GRID':
        {
          const s = core.getSnapSettings();
          core.setSnapSettings({ gridSnap: !s.gridSnap });
          core.logCommandMessage(`GRID SNAP: ${!s.gridSnap ? 'ON' : 'OFF'}`);
        }
        break;

      case 'SELECT':
      case 'SEL':
        core.setActiveTool('select');
        break;

      case 'HELP':
        core.logCommandMessage('Available commands:');
        core.logCommandMessage('  Draw: LINE (L), PLINE (PL), CIRCLE (C), RECTANGLE (REC), ARC (A), SPLINE (SPL), ELLIPSE (EL), HATCH (H), TEXT (T)');
        core.logCommandMessage('  Modify: ERASE (E), MOVE (M), COPY (CO), ROTATE (RO), MIRROR (MI), OFFSET (O), FILLET (F), CHAMFER (CHA), TRIM (TR), EXTEND (EX), STRETCH (S), ARRAY (AR), EXPLODE (X)');
        core.logCommandMessage('  Blocks: BLOCK (B), INSERT (I), DESIGNCENTER (DC), ATTEDIT');
        core.logCommandMessage('  Dimensions: DIMLINEAR (DLI), DIMALIGNED (DAL), DIMRADIUS (DRA), DIMDIAMETER (DDI), DIMANGULAR (DAN), DIMORDINATE (DOR), MLEADER (ML), DIMSTYLE (D), DATAEXTRACTION (DX / BCOUNT)');
        core.logCommandMessage('  Precision: ORTHO (F8), POLAR (F10), OTRACK (F11), OSNAP (F3), GRID (F9)');
        core.logCommandMessage('  Navigation: PAN (P), ZOOM (Z E)');
        core.logCommandMessage('  Utility: DIST (DI), UNDO (U), REDO, SELECT (SEL), HELP');
        core.logCommandMessage('  Coordinates: type X,Y (e.g. 50,100)');
        break;

      default:
        core.logCommandMessage(`Unknown command "${cmdStr}". Type HELP for command list.`);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setInputVal(commandHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setInputVal('');
      } else {
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
    } else if (e.key === 'Escape') {
      setInputVal('');
      core.handleKeyDown(e.nativeEvent);
    }
  };

  return (
    <div className="bg-[#181a1f] border-t border-[#3a3f4b] flex flex-col font-mono text-[12px] h-32 select-text shadow-inner">
      {/* History Output Area */}
      <div className="flex-1 overflow-y-auto px-3 py-1.5 space-y-0.5 text-[#abb2bf] font-mono leading-relaxed">
        {history.map((line, idx) => (
          <div key={idx} className="whitespace-pre-wrap break-all hover:bg-white/5 px-1 rounded">
            {line.startsWith('Command:') ? (
              <span className="text-[#61afef] font-semibold">{line}</span>
            ) : line.startsWith('<') ? (
              <span className="text-[#98c379] italic">{line}</span>
            ) : line.startsWith('DIST:') ? (
              <span className="text-[#e5c07b] font-semibold">{line}</span>
            ) : (
              line
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Active Command Input Line */}
      <form
        onSubmit={handleCommandSubmit}
        className="flex items-center bg-[#21252b] border-t border-[#2c313a] px-3 py-1 gap-2"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="text-[#61afef] font-semibold select-none whitespace-nowrap">
          {currentPrompt}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type a command or coordinates (e.g. "LINE", "C", "100,50")...'
          className="flex-1 bg-transparent text-[#e5e9f0] outline-none font-mono text-[12px] placeholder-[#5c6370]"
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
};
