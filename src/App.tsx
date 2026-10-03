import React, { useState, useMemo, useEffect } from 'react';
import { CADCore } from './core/CADCore';
import { registerDefaultPlugins } from './plugins';
import { CADViewport } from './components/CADViewport';
import { TopMenuBar } from './components/TopMenuBar';
import { RibbonToolbar } from './components/RibbonToolbar';
import { CommandLine } from './components/CommandLine';
import { StatusBar } from './components/StatusBar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayerModal } from './components/LayerModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { loadSampleDrawing } from './utils/sampleDrawings';

export const App: React.FC = () => {
  // Initialize CADCore microkernel singleton
  const core = useMemo(() => {
    const cadCore = new CADCore(1200, 800);
    // Register all modular plugins onto the microkernel
    registerDefaultPlugins(cadCore);
    return cadCore;
  }, []);

  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [showDynamicInput, setShowDynamicInput] = useState(true);

  // Load sample architectural floorplan on first mount
  useEffect(() => {
    loadSampleDrawing(core, 'architectural');
  }, [core]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1b1e23] text-[#abb2bf] overflow-hidden select-none">
      {/* 1. Classic AutoCAD Menu Bar */}
      <TopMenuBar
        core={core}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onLoadSample={(type) => loadSampleDrawing(core, type)}
      />

      {/* 2. Ribbon Toolbar */}
      <RibbonToolbar core={core} onOpenLayers={() => setIsLayersOpen(true)} />

      {/* 3. Central Canvas & Dockable Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        <CADViewport core={core} showDynamicInput={showDynamicInput} />

        {/* Right Dockable Properties Panel */}
        <PropertiesPanel
          core={core}
          isOpen={isPropertiesOpen}
          onClose={() => setIsPropertiesOpen(false)}
        />
      </div>

      {/* 4. AutoCAD Command Line Console */}
      <CommandLine core={core} />

      {/* 5. AutoCAD Status Bar */}
      <StatusBar
        core={core}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenProperties={() => setIsPropertiesOpen(!isPropertiesOpen)}
        isPropertiesOpen={isPropertiesOpen}
        showDynamicInput={showDynamicInput}
        setShowDynamicInput={setShowDynamicInput}
      />

      {/* Modals */}
      <LayerModal
        core={core}
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
    </div>
  );
};

export default App;
