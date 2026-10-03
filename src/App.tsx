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
import { DimStyleModal } from './components/DimStyleModal';
import { DataExtractionModal } from './components/DataExtractionModal';
import { PlotModal } from './components/PlotModal';
import { DXFImportModal } from './components/DXFImportModal';
import { RasterImageModal } from './components/RasterImageModal';
import { ScriptEditorModal } from './components/ScriptEditorModal';
import { CollaborationModal } from './components/CollaborationModal';
import { VersionControlModal } from './components/VersionControlModal';
import { PerformanceHUD } from './components/PerformanceHUD';
import { GraphicAccelerationModal } from './components/GraphicAccelerationModal';
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
  const [isDimStyleOpen, setIsDimStyleOpen] = useState(false);
  const [isDataExtractionOpen, setIsDataExtractionOpen] = useState(false);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [isDXFImportOpen, setIsDXFImportOpen] = useState(false);
  const [isRasterImageOpen, setIsRasterImageOpen] = useState(false);
  const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [isVCSOpen, setIsVCSOpen] = useState(false);
  const [isPerfHUDOpen, setIsPerfHUDOpen] = useState(false);
  const [isPerfModalOpen, setIsPerfModalOpen] = useState(false);
  const [attributesModalEntity, setAttributesModalEntity] = useState<BlockReferenceEntity | null>(null);
  const [showDynamicInput, setShowDynamicInput] = useState(true);

  // Load sample architectural floorplan on first mount
  useEffect(() => {
    loadSampleDrawing(core, 'architectural');
  }, [core]);

  // Hook block and dimension event modal triggers
  useEffect(() => {
    const unsubCreate = core.on('block:open_create_modal', () => {
      setIsBlockCreateOpen(true);
    });
    const unsubAttrs = core.on('block:open_attributes_modal', (ent: BlockReferenceEntity) => {
      setAttributesModalEntity(ent);
    });
    const unsubDimStyle = core.on('dimstyle:open_modal', () => {
      setIsDimStyleOpen(true);
    });
    const unsubDataExt = core.on('data_extraction:open_modal', () => {
      setIsDataExtractionOpen(true);
    });
    const unsubPlot = core.on('plot:open_modal', () => {
      setIsPlotModalOpen(true);
    });
    const unsubDxfImport = core.on('dxf:open_import_modal', () => {
      setIsDXFImportOpen(true);
    });
    const unsubRasterImg = core.on('image:open_attach_modal', () => {
      setIsRasterImageOpen(true);
    });
    const unsubScript = core.on('script:open_editor', () => {
      setIsScriptEditorOpen(true);
    });
    const unsubCollab = core.on('collab:open_modal', () => {
      setIsCollabOpen(true);
    });
    const unsubVcs = core.on('vcs:open_modal', () => {
      setIsVCSOpen(true);
    });
    const unsubPerfModal = core.on('perf:open_modal', () => {
      setIsPerfModalOpen(true);
    });
    const unsubPerfHUD = core.on('perf:toggle_hud', (val: boolean) => {
      setIsPerfHUDOpen(val);
    });
    const unsubDyn = core.on('dynamicInput:toggle', () => {
      setShowDynamicInput((prev) => !prev);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPlotModalOpen(true);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        core.togglePerformanceHUD();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubCreate();
      unsubAttrs();
      unsubDimStyle();
      unsubDataExt();
      unsubPlot();
      unsubDxfImport();
      unsubRasterImg();
      unsubScript();
      unsubCollab();
      unsubVcs();
      unsubPerfModal();
      unsubPerfHUD();
      unsubDyn();
      window.removeEventListener('keydown', handleKeyDown);
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
        onOpenDimStyle={() => setIsDimStyleOpen(true)}
        onOpenDataExtraction={() => setIsDataExtractionOpen(true)}
        onOpenPlot={() => setIsPlotModalOpen(true)}
        onOpenDXFImport={() => setIsDXFImportOpen(true)}
        onOpenRasterImage={() => setIsRasterImageOpen(true)}
        onLoadSample={(type) => loadSampleDrawing(core, type)}
      />

      {/* 2. Ribbon Toolbar */}
      <RibbonToolbar
        core={core}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenDesignCenter={() => setIsDesignCenterOpen(true)}
        onOpenCreateBlock={() => setIsBlockCreateOpen(true)}
        onOpenDimStyle={() => setIsDimStyleOpen(true)}
        onOpenDataExtraction={() => setIsDataExtractionOpen(true)}
        onOpenPlot={() => setIsPlotModalOpen(true)}
        onOpenDXFImport={() => setIsDXFImportOpen(true)}
        onOpenRasterImage={() => setIsRasterImageOpen(true)}
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
        onOpenDimStyle={() => setIsDimStyleOpen(true)}
        onOpenDataExtraction={() => setIsDataExtractionOpen(true)}
      />

      {/* 5. AutoCAD Status Bar with Layout Tabs */}
      <StatusBar
        core={core}
        onOpenLayers={() => setIsLayersOpen(true)}
        onOpenProperties={() => setIsPropertiesOpen(!isPropertiesOpen)}
        onOpenPlotModal={() => setIsPlotModalOpen(true)}
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

      <DimStyleModal
        core={core}
        isOpen={isDimStyleOpen}
        onClose={() => setIsDimStyleOpen(false)}
      />

      <DataExtractionModal
        core={core}
        isOpen={isDataExtractionOpen}
        onClose={() => setIsDataExtractionOpen(false)}
      />

      <PlotModal
        core={core}
        isOpen={isPlotModalOpen}
        onClose={() => setIsPlotModalOpen(false)}
      />

      <DXFImportModal
        core={core}
        isOpen={isDXFImportOpen}
        onClose={() => setIsDXFImportOpen(false)}
      />

      <RasterImageModal
        core={core}
        isOpen={isRasterImageOpen}
        onClose={() => setIsRasterImageOpen(false)}
      />

      <ScriptEditorModal
        core={core}
        isOpen={isScriptEditorOpen}
        onClose={() => setIsScriptEditorOpen(false)}
      />

      <CollaborationModal
        core={core}
        isOpen={isCollabOpen}
        onClose={() => setIsCollabOpen(false)}
      />

      <VersionControlModal
        core={core}
        isOpen={isVCSOpen}
        onClose={() => setIsVCSOpen(false)}
      />

      {/* Phase 8: WebGPU & Big Data HUD and Acceleration Modal */}
      <PerformanceHUD
        core={core}
        visible={isPerfHUDOpen}
        onClose={() => {
          setIsPerfHUDOpen(false);
          core.setPerformanceHUDVisible(false);
        }}
        onOpenSettings={() => setIsPerfModalOpen(true)}
      />

      <GraphicAccelerationModal
        core={core}
        isOpen={isPerfModalOpen}
        onClose={() => setIsPerfModalOpen(false)}
      />
    </div>
  );
};

export default App;
