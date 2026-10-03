import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Eye,
  Layers,
  Cpu,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
  Sliders,
  CheckCircle,
  X,
} from 'lucide-react';
import { CADCoreAPI, PerformanceMetrics, GraphicsAccelerationOptions } from '../core/types';

interface PerformanceHUDProps {
  core: CADCoreAPI;
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const PerformanceHUD: React.FC<PerformanceHUDProps> = ({
  core,
  visible,
  onClose,
  onOpenSettings,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(core.getPerformanceMetrics());
  const [options, setOptions] = useState<GraphicsAccelerationOptions>(core.getGraphicsOptions());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setMetrics(core.getPerformanceMetrics());
    }, 250);

    const unsubMetrics = core.on('perf:metrics_updated', () => {
      setMetrics(core.getPerformanceMetrics());
    });

    const unsubOptions = core.on('perf:options_changed', () => {
      setOptions(core.getGraphicsOptions());
    });

    return () => {
      clearInterval(interval);
      unsubMetrics();
      unsubOptions();
    };
  }, [core, visible]);

  if (!visible) return null;

  const fpsColor =
    metrics.fps >= 55 ? 'text-emerald-400' : metrics.fps >= 30 ? 'text-amber-400' : 'text-rose-400';

  const handleToggleCulling = () => {
    const next = !options.frustumCullingEnabled;
    core.setGraphicsOptions({ frustumCullingEnabled: next });
    setOptions(core.getGraphicsOptions());
  };

  const handleToggleLOD = () => {
    const next = !options.lodEnabled;
    core.setGraphicsOptions({ lodEnabled: next });
    setOptions(core.getGraphicsOptions());
  };

  const handleToggleInstancing = () => {
    const next = !options.instancedRenderingEnabled;
    core.setGraphicsOptions({ instancedRenderingEnabled: next });
    setOptions(core.getGraphicsOptions());
  };

  const handleAddStress = (count: number) => {
    const t0 = performance.now();
    const added = core.generateStressEntities(count, 3000, 'mixed');
    const t1 = performance.now();
    setStatusMessage(`+${added.toLocaleString()} entidades adicionadas (${(t1 - t0).toFixed(0)}ms)`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleClearStress = () => {
    core.clearStressEntities();
    setStatusMessage('Entidades de estresse removidas');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className="absolute top-14 right-4 z-40 select-none font-mono text-xs shadow-2xl transition-all">
      <div className="rounded-lg border border-slate-700/80 bg-slate-900/90 backdrop-blur-md text-slate-200 overflow-hidden shadow-black/50">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700/80 gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-semibold tracking-wide text-white text-[11px]">
              WEBGPU & BIG DATA HUD
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] border border-blue-500/30">
              {metrics.rendererBackend}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white"
              title={isMinimized ? 'Expandir' : 'Minimizar'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-rose-400"
              title="Fechar HUD"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {isMinimized ? (
          <div className="flex items-center gap-4 px-3 py-1.5 bg-slate-950/60">
            <div className="flex items-baseline gap-1">
              <span className={`text-base font-bold ${fpsColor}`}>{metrics.fps}</span>
              <span className="text-[10px] text-slate-400">FPS</span>
            </div>
            <div className="text-[11px] text-slate-300">
              {metrics.renderedEntities.toLocaleString()} / {metrics.totalEntities.toLocaleString()} ents
            </div>
          </div>
        ) : (
          /* Full Expanded View */
          <div className="p-3 space-y-2.5 w-72 bg-slate-950/70">
            {/* FPS & Frame Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-slate-800/40 border border-slate-700/50 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Taxa de Quadros</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-2xl font-bold ${fpsColor}`}>{metrics.fps}</span>
                  <span className="text-[10px] text-slate-400">FPS</span>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-800/40 border border-slate-700/50 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Tempo de Quadro</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-bold text-slate-100">{metrics.frameTimeMs}</span>
                  <span className="text-[10px] text-slate-400">ms</span>
                </div>
              </div>
            </div>

            {/* Entity Culling Meter */}
            <div className="p-2 rounded bg-slate-800/40 border border-slate-700/50 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" /> Culling Frustum:
                </span>
                <span className="font-semibold text-cyan-300">
                  {(metrics.cullingRatio * 100).toFixed(1)}% descartado
                </span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, metrics.cullingRatio * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Visíveis: {metrics.renderedEntities.toLocaleString()}</span>
                <span>Total: {metrics.totalEntities.toLocaleString()}</span>
              </div>
            </div>

            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                <span className="text-slate-400">LOD Ativo:</span>
                <span className="font-semibold text-emerald-400">{metrics.activeLOD}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                <span className="text-slate-400">Draw Calls:</span>
                <span className="font-semibold text-amber-300">{metrics.drawCalls}</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                <span className="text-slate-400">Worker Thread:</span>
                <span className={`font-semibold ${metrics.workerActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {metrics.workerActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
                <span className="text-slate-400">Memória VRAM:</span>
                <span className="font-semibold text-indigo-300">{metrics.memoryEstimateMB} MB</span>
              </div>
            </div>

            {/* Quick Acceleration Toggles */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Otimizações em Tempo Real</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={handleToggleCulling}
                  className={`px-1.5 py-1 rounded text-[10px] border flex items-center justify-center gap-1 transition-colors ${
                    options.frustumCullingEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/40 border-slate-700/40 text-slate-500 line-through'
                  }`}
                  title="Descarte de entidades fora da tela"
                >
                  <Eye className="w-2.5 h-2.5" /> Culling
                </button>
                <button
                  onClick={handleToggleLOD}
                  className={`px-1.5 py-1 rounded text-[10px] border flex items-center justify-center gap-1 transition-colors ${
                    options.lodEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/40 border-slate-700/40 text-slate-500 line-through'
                  }`}
                  title="Simplificação de curvas conforme o zoom"
                >
                  <Layers className="w-2.5 h-2.5" /> LOD
                </button>
                <button
                  onClick={handleToggleInstancing}
                  className={`px-1.5 py-1 rounded text-[10px] border flex items-center justify-center gap-1 transition-colors ${
                    options.instancedRenderingEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/40 border-slate-700/40 text-slate-500 line-through'
                  }`}
                  title="Agrupamento de linhas em lotes únicos"
                >
                  <Cpu className="w-2.5 h-2.5" /> Instancing
                </button>
              </div>
            </div>

            {/* Big Data CAD Stress Buttons */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Teste de Carga Big Data</span>
                {metrics.totalEntities > 0 && (
                  <button
                    onClick={handleClearStress}
                    className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
                    title="Limpar entidades geradas no teste"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Limpar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleAddStress(5000)}
                  className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 text-[10px] flex items-center justify-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" /> +5.000 Ents
                </button>
                <button
                  onClick={() => handleAddStress(20000)}
                  className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-[10px] flex items-center justify-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" /> +20.000 Ents
                </button>
              </div>
            </div>

            {/* Notification message */}
            {statusMessage && (
              <div className="p-1 text-center bg-emerald-500/20 text-emerald-300 rounded text-[10px] border border-emerald-500/30">
                {statusMessage}
              </div>
            )}

            {/* Full Diagnostics Button */}
            <div className="pt-1">
              <button
                onClick={onOpenSettings}
                className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 rounded text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Painel Completo de WebGPU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
