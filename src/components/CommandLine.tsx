import React, { useState, useEffect, useRef } from 'react';
import { CADCore } from '../core/CADCore';

interface CommandLineProps {
  core: CADCore;
}

export const CommandLine: React.FC<CommandLineProps> = ({ core }) => {
  const [history, setHistory] = useState<string[]>([
    'CloneCAD Modular Engine [Version 2.0.26]',
    '(c) 2026 CloneCAD Architecture. All rights reserved.',
    'AutoCAD Dark UI Loaded. Microkernel core initialized.',
    'Type "HELP" or command name (e.g. "LINE", "CIRCLE", "M", "E", "ZOOM").',
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
        core.logCommandMessage('  Draw: LINE (L), PLINE (PL), CIRCLE (C), RECTANGLE (REC), ARC (A), TEXT (T)');
        core.logCommandMessage('  Modify: ERASE (E), MOVE (M), COPY (CO), ROTATE (RO)');
        core.logCommandMessage('  Navigation: PAN (P), ZOOM (Z E)');
        core.logCommandMessage('  Utility: DIST (DI), UNDO (U), REDO, ORTHO, OSNAP, GRID, HELP');
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
