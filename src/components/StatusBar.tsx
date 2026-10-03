import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { SnapSettings } from '../core/types';
import {
  Grid,
  Magnet,
  Maximize2,
  Navigation,
  Compass,
  Layers,
  Sliders,
} from 'lucide-react';

interface StatusBarProps {
  core: CADCore;
  onOpenLayers: () => void;
  onOpenProperties: () => void;
  isPropertiesOpen: boolean;
  showDynamicInput: boolean;
  setShowDynamicInput: (val: boolean) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  core,
  onOpenLayers,
  onOpenProperties,
  isPropertiesOpen,
  showDynamicInput,
  setShowDynamicInput,
}) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [snapSettings, setSnapSettings] = useState<SnapSettings>(core.getSnapSettings());
  const [ortho, setOrtho] = useState<boolean>(core.isOrthoMode());
  const [activeTab, setActiveTab] = useState<'model' | 'layout1'>('model');

  useEffect(() => {
    const unsubSnap = core.on('snap:changed', (s) => setSnapSettings(s));
    const unsubCursor = core.on('cursor:moved', (pt) => setCoords(pt));
    return () => {
      unsubSnap();
      unsubCursor();
    };
  }, [core]);

  const toggleOrtho = () => {
    const next = !ortho;
    core.setOrthoMode(next);
    setOrtho(next);
  };

  const toggleOsnap = () => {
    const next = !snapSettings.enabled;
    core.setSnapSettings({ enabled: next });
    setSnapSettings((prev) => ({ ...prev, enabled: next }));
    core.logCommandMessage(`<Osnap ${next ? 'ON' : 'OFF'}>`);
  };

  const toggleGridSnap = () => {
    const next = !snapSettings.gridSnap;
    core.setSnapSettings({ gridSnap: next });
    setSnapSettings((prev) => ({ ...prev, gridSnap: next }));
    core.logCommandMessage(`<Grid Snap ${next ? 'ON' : 'OFF'}>`);
  };

  return (
    <div className="h-7 bg-[#1b1e23] border-t border-[#2c313a] flex items-center justify-between px-2 text-[11px] font-sans text-[#abb2bf] select-none z-30">
      {/* Left: Model / Layout Tabs */}
      <div className="flex items-center h-full gap-1">
        <button
          onClick={() => setActiveTab('model')}
          className={`h-full px-3 text-xs font-semibold flex items-center transition-colors border-r border-[#2c313a] ${
            activeTab === 'model'
              ? 'bg-[#21252b] text-white border-b-2 border-b-[#007acc]'
              : 'text-[#6c7280] hover:text-[#abb2bf]'
          }`}
        >
          MODEL
        </button>
        <button
          onClick={() => setActiveTab('layout1')}
          className={`h-full px-3 text-xs flex items-center transition-colors border-r border-[#2c313a] ${
            activeTab === 'layout1'
              ? 'bg-[#21252b] text-white border-b-2 border-b-[#007acc]'
              : 'text-[#6c7280] hover:text-[#abb2bf]'
          }`}
        >
          LAYOUT 1
        </button>
      </div>

      {/* Center: Coordinates Display */}
      <div className="flex items-center gap-3 font-mono text-[11px] text-[#98c379] px-2">
        <span>X: {coords.x.toFixed(4)}</span>
        <span>Y: {coords.y.toFixed(4)}</span>
        <span className="text-[#5c6370]">Z: 0.0000</span>
      </div>

      {/* Right: CAD Drafting Settings Toggles */}
      <div className="flex items-center gap-1 h-full">
        {/* SNAP TOGGLE */}
        <button
          onClick={toggleGridSnap}
          title="Grid Snap (F9)"
          className={`h-6 px-2 flex items-center gap-1 rounded transition-colors text-[10px] font-bold ${
            snapSettings.gridSnap
              ? 'bg-[#007acc] text-white'
              : 'bg-[#282c34] text-[#abb2bf] hover:bg-[#353b45]'
          }`}
        >
          <Grid size={12} />
          SNAP
        </button>

        {/* ORTHO TOGGLE (F8) */}
        <button
          onClick={toggleOrtho}
          title="Ortho Mode (F8)"
          className={`h-6 px-2 flex items-center gap-1 rounded transition-colors text-[10px] font-bold ${
            ortho
              ? 'bg-[#007acc] text-white'
              : 'bg-[#282c34] text-[#abb2bf] hover:bg-[#353b45]'
          }`}
        >
          <Compass size={12} />
          ORTHO
        </button>

        {/* OSNAP TOGGLE (F3) */}
        <button
          onClick={toggleOsnap}
          title="Object Snap (F3)"
          className={`h-6 px-2 flex items-center gap-1 rounded transition-colors text-[10px] font-bold ${
            snapSettings.enabled
              ? 'bg-[#007acc] text-white'
              : 'bg-[#282c34] text-[#abb2bf] hover:bg-[#353b45]'
          }`}
        >
          <Magnet size={12} />
          OSNAP
        </button>

        {/* DYN (Dynamic Input) */}
        <button
          onClick={() => setShowDynamicInput(!showDynamicInput)}
          title="Dynamic Input (F12)"
          className={`h-6 px-2 flex items-center gap-1 rounded transition-colors text-[10px] font-bold ${
            showDynamicInput
              ? 'bg-[#007acc] text-white'
              : 'bg-[#282c34] text-[#abb2bf] hover:bg-[#353b45]'
          }`}
        >
          DYN
        </button>

        {/* Zoom Extents */}
        <button
          onClick={() => core.zoomExtents()}
          title="Zoom Extents (Z E)"
          className="h-6 px-2 flex items-center gap-1 bg-[#282c34] hover:bg-[#353b45] text-[#abb2bf] rounded text-[10px]"
        >
          <Maximize2 size={12} />
          ZOOM
        </button>

        {/* Layer Manager Modal trigger */}
        <button
          onClick={onOpenLayers}
          title="Layer Properties"
          className="h-6 px-2 flex items-center gap-1 bg-[#282c34] hover:bg-[#353b45] text-[#abb2bf] rounded text-[10px]"
        >
          <Layers size={12} />
          LAYERS
        </button>

        {/* Properties Panel trigger */}
        <button
          onClick={onOpenProperties}
          title="Properties Panel (Ctrl+1)"
          className={`h-6 px-2 flex items-center gap-1 rounded text-[10px] transition-colors ${
            isPropertiesOpen
              ? 'bg-[#007acc] text-white'
              : 'bg-[#282c34] text-[#abb2bf] hover:bg-[#353b45]'
          }`}
        >
          <Sliders size={12} />
          PROPS
        </button>
      </div>
    </div>
  );
};
