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
import { DesignCenterModal } from './components/DesignCenterModal';
import { BlockCreationModal } from './components/BlockCreationModal';
import { BlockAttributesModal } from './components/BlockAttributesModal';
import { loadSampleDrawing } from './utils/sampleDrawings';
import { BlockReferenceEntity } from './core/types';

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
  const [isDesignCenterOpen, setIsDesignCenterOpen] = useState(false);
  const [isBlockCreateOpen, setIsBlockCreateOpen] = useState(false);
  const [attributesModalEntity, setAttributesModalEntity] = useState<BlockReferenceEntity | null>(null);
  const [showDynamicInput, setShowDynamicInput] = useState(true);

  // Load sample architectural floorplan on first mount
  useEffect(() => {
    loadSampleDrawing(core, 'architectural');
  }, [core]);

  // Hook block event modal triggers
  useEffect(() => {
    const unsubCreate = core.on('block:open_create_modal', () => {
      setIsBlockCreateOpen(true);
    });
    const unsubAttrs = core.on('block:open_attributes_modal', (ent: BlockReferenceEntity) => {
      setAttributesModalEntity(ent);
    });
    return () => {
      unsubCreate();
      unsubAttrs();
    };
  }, [core]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1b1e23] text-[#abb2bf] overflow-hidden select-none">
      {/* 1. Classic AutoCAD Menu Bar */}
      <TopMenuBar
        core={core}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenDesignCenter={() => setIsDesignCenterOpen(true)}
        onOpenCreateBlock={() => setIsBlockCreateOpen(true)}
        onLoadSample={(type) => loadSampleDrawing(core, type)}
      />

      {/* 2. Ribbon Toolbar */}
      <RibbonToolbar
        core={core}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenDesignCenter={() => setIsDesignCenterOpen(true)}
        onOpenCreateBlock={() => setIsBlockCreateOpen(true)}
      />

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
      <CommandLine
        core={core}
        onOpenDesignCenter={() => setIsDesignCenterOpen(true)}
        onOpenCreateBlock={() => setIsBlockCreateOpen(true)}
      />

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

      <DesignCenterModal
        core={core}
        isOpen={isDesignCenterOpen}
        onClose={() => setIsDesignCenterOpen(false)}
        onOpenCreateModal={() => setIsBlockCreateOpen(true)}
      />

      <BlockCreationModal
        core={core}
        isOpen={isBlockCreateOpen}
        onClose={() => setIsBlockCreateOpen(false)}
      />

      <BlockAttributesModal
        core={core}
        isOpen={!!attributesModalEntity}
        onClose={() => setAttributesModalEntity(null)}
        entity={attributesModalEntity}
      />
    </div>
  );
};

export default App;
