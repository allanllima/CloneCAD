import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Activity,
  Cpu,
  Layers,
  Eye,
  Sliders,
  Play,
  Trash2,
  CheckCircle,
  FileCode,
  HardDrive,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  CADCoreAPI,
  PerformanceMetrics,
  GraphicsAccelerationOptions,
} from '../core/types';
import { WebGPUManager, WGSL_CULLING_SHADER, WGSL_BATCH_INTERSECTION_SHADER } from '../core/gpu/WebGPUManager';
import { CADWorkerBridge } from '../core/workers/CADWorkerBridge';

interface GraphicAccelerationModalProps {
  core: CADCoreAPI;
  isOpen: boolean;
  onClose: () => void;
}

export const GraphicAccelerationModal: React.FC<GraphicAccelerationModalProps> = ({
  core,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'benchmark' | 'shaders'>('status');
  const [metrics, setMetrics] = useState<PerformanceMetrics>(core.getPerformanceMetrics());
  const [options, setOptions] = useState<GraphicsAccelerationOptions>(core.getGraphicsOptions());

  // Benchmark state
  const [stressCount, setStressCount] = useState<number>(10000);
  const [stressType, setStressType] = useState<'line' | 'circle' | 'rectangle' | 'mixed'>('mixed');
  const [stressArea, setStressArea] = useState<number>(3000);
  const [benchResult, setBenchResult] = useState<{ count: number; durationMs: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const webgpu = WebGPUManager.getInstance();
  const adapterInfo = webgpu.getAdapterDetails();
  const workerBridge = CADWorkerBridge.getInstance();

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setMetrics(core.getPerformanceMetrics());
    }, 300);

    return () => clearInterval(interval);
  }, [core, isOpen]);

  if (!isOpen) return null;

  const handleSaveOptions = (updates: Partial<GraphicsAccelerationOptions>) => {
    const updated = { ...options, ...updates };
    setOptions(updated);
    core.setGraphicsOptions(updated);
  };

  const handleRunStress = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const t0 = performance.now();
      const added = core.generateStressEntities(stressCount, stressArea, stressType);
      const t1 = performance.now();
      setBenchResult({
        count: added,
        durationMs: Number((t1 - t0).toFixed(1)),
      });
      setIsGenerating(false);
    }, 10);
  };

  const handleClearStress = () => {
    core.clearStressEntities();
    setBenchResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in font-sans">
      <div className="flex flex-col w-[760px] max-h-[88vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Aceleração Gráfica & Big Data CAD (Fase 8)
              </h2>
              <p className="text-xs text-slate-400">
                Pipeline WebGPU, Compute Shaders, LOD Dinâmico e Web Workers para alta escala
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex px-6 bg-slate-850 border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> Telemetria & Hardware
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> Otimizações Gráficas
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'benchmark'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-4 h-4" /> Benchmark Big Data
          </button>
          <button
            onClick={() => setActiveTab('shaders')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'shaders'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" /> WGSL Shaders
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh] text-xs">
          {/* TAB 1: Status & Hardware */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Telemetry Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Frame Rate</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-emerald-400">{metrics.fps}</span>
                    <span className="text-slate-400 text-[10px]">FPS</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Latência: {metrics.frameTimeMs} ms
                  </span>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Culling Frustum</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-cyan-400">
                      {(metrics.cullingRatio * 100).toFixed(0)}%
                    </span>
                    <span className="text-slate-400 text-[10px]">poupado</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {metrics.culledEntities.toLocaleString()} descartados
                  </span>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Draw Calls</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-amber-300">{metrics.drawCalls}</span>
                    <span className="text-slate-400 text-[10px]">chamadas</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    LOD Ativo: {metrics.activeLOD}
                  </span>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Entidades Cena</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-slate-100">
                      {metrics.totalEntities.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Visíveis: {metrics.renderedEntities.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Hardware & Driver Diagnostics */}
              <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-slate-200 font-semibold border-b border-slate-700/80 pb-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>Diagnóstico do Pipeline Gráfico</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Backend Renderizador:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-semibold text-white">{metrics.rendererBackend}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Aceleração por Hardware
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Dispositivo de Vídeo:</span>
                    <span className="font-semibold text-white mt-0.5 block">{adapterInfo.device}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Fabricante da GPU:</span>
                    <span className="font-semibold text-white mt-0.5 block">{adapterInfo.vendor}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Web Worker Background Thread:</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`font-semibold ${workerBridge.isWorkerActive() ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {workerBridge.isWorkerActive() ? 'Web Worker Ativo (0ms input lag)' : 'Fallback Main Thread'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Settings */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" /> Frustum Culling Dinâmico
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Descarta automaticamente todas as geometrias fora da janela visível da viewport,
                      evitando upload desnecessário para a GPU.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.frustumCullingEnabled}
                    onChange={(e) => handleSaveOptions({ frustumCullingEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-700/60 pt-4">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" /> Level of Detail (LOD) Adaptativo
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Simplifica curvas (arcos, splines, círculos) e oculta textos/hachuras subpixel ao dar zoom out,
                      preservando resolução ultra-alta ao aproximar.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.lodEnabled}
                    onChange={(e) => handleSaveOptions({ lodEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-700/60 pt-4">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-400" /> Instanced & Merged Buffer Line Rendering
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Agrupa milhares de linhas em lotes únicos de BufferGeometry, reduzindo centenas de milhares
                      de Draw Calls para apenas 1 por camada de cor.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={options.instancedRenderingEnabled}
                    onChange={(e) => handleSaveOptions({ instancedRenderingEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </div>

                <div className="border-t border-slate-700/60 pt-4 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold text-white">Margem de Segurança do Culling</span>
                    <span className="text-cyan-400 font-mono">{options.cullingMargin} unidades</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={options.cullingMargin}
                    onChange={(e) => handleSaveOptions({ cullingMargin: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                  <p className="text-slate-400 text-[10px]">
                    Evita pop-in visual ao realizar pan rápido mantendo uma borda ao redor da tela pré-carregada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Benchmark */}
          {activeTab === 'benchmark' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-3">
                <span className="font-semibold text-white block">Configuração do Teste de Estresse</span>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Quantidade de Entidades:</label>
                    <select
                      value={stressCount}
                      onChange={(e) => setStressCount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    >
                      <option value={1000}>1.000 entidades (Leve)</option>
                      <option value={10000}>10.000 entidades (Médio)</option>
                      <option value={50000}>50.000 entidades (Pesado Big Data)</option>
                      <option value={100000}>100.000 entidades (Stress Máximo)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Tipo de Geometria:</label>
                    <select
                      value={stressType}
                      onChange={(e) => setStressType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    >
                      <option value="mixed">Misto (Linhas, Círculos, Retângulos)</option>
                      <option value="line">Apenas Linhas</option>
                      <option value="circle">Apenas Círculos</option>
                      <option value="rectangle">Apenas Retângulos</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Área de Dispersão:</label>
                    <select
                      value={stressArea}
                      onChange={(e) => setStressArea(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200"
                    >
                      <option value={1000}>1.000 x 1.000 unidades</option>
                      <option value={3000}>3.000 x 3.000 unidades</option>
                      <option value={10000}>10.000 x 10.000 unidades</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleRunStress}
                    disabled={isGenerating}
                    className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {isGenerating ? 'Gerando Entidades...' : `Gerar ${stressCount.toLocaleString()} Entidades`}
                  </button>

                  <button
                    onClick={handleClearStress}
                    className="py-2 px-4 bg-slate-800 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-500/40 text-rose-300 rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Limpar Estresse
                  </button>
                </div>

                {benchResult && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {benchResult.count.toLocaleString()} entidades instanciadas e indexadas na R-Tree
                    </span>
                    <span className="font-mono font-bold">{benchResult.durationMs} ms</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: WGSL Shaders */}
          {activeTab === 'shaders' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                Código-fonte dos compute shaders nativos em **WGSL (WebGPU Shading Language)** utilizados
                para cálculo massivo de visibilidade e interseções diretamente na placa de vídeo:
              </p>

              <div>
                <span className="font-mono text-cyan-300 block mb-1">
                  1. WGSL Frustum Culling Shader (@compute @workgroup_size(64))
                </span>
                <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48">
                  {WGSL_CULLING_SHADER.trim()}
                </pre>
              </div>

              <div>
                <span className="font-mono text-amber-300 block mb-1">
                  2. WGSL Batch Line Intersection Shader
                </span>
                <pre className="p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48">
                  {WGSL_BATCH_INTERSECTION_SHADER.trim()}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800/80 border-t border-slate-700">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>WebGL 2.0 & WebGPU Fallback Automatizado</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
