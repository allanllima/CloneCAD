import React, { useState, useEffect, useMemo } from 'react';
import { CADCore } from '../core/CADCore';
import {
  PaperSize,
  PaperOrientation,
  PlotArea,
  PlotConfig,
  STANDARD_PAPER_SIZES,
  STANDARD_SCALES,
} from '../core/layout/LayoutTypes';
import {
  X,
  Printer,
  FileText,
  Download,
  Check,
  Eye,
  Sliders,
  Maximize2,
} from 'lucide-react';

interface PlotModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const PlotModal: React.FC<PlotModalProps> = ({ core, isOpen, onClose }) => {
  const activeSpace = core.getActiveSpace();
  const currentLayout = core.getActiveLayout();

  const [targetLayoutId, setTargetLayoutId] = useState<string>(
    activeSpace !== 'model' ? activeSpace : core.getLayouts()[0]?.id || ''
  );
  const [plotArea, setPlotArea] = useState<PlotArea>(activeSpace === 'model' ? 'extents' : 'layout');
  const [paperSize, setPaperSize] = useState<PaperSize>(currentLayout?.paperSize || 'A1');
  const [orientation, setOrientation] = useState<PaperOrientation>(currentLayout?.orientation || 'landscape');
  const [plotStyleTable, setPlotStyleTable] = useState<string>(currentLayout?.plotStyleTable || 'architectural.ctb');
  const [fitToPage, setFitToPage] = useState<boolean>(activeSpace === 'model');
  const [scaleName, setScaleName] = useState<string>('1:50');
  const [fileName, setFileName] = useState<string>('prancha_executiva.pdf');

  useEffect(() => {
    if (isOpen) {
      const space = core.getActiveSpace();
      const layout = core.getActiveLayout();
      if (layout) {
        setTargetLayoutId(layout.id);
        setPaperSize(layout.paperSize);
        setOrientation(layout.orientation);
        setPlotStyleTable(layout.plotStyleTable);
        setPlotArea('layout');
        setFitToPage(false);
      } else {
        setPlotArea('extents');
        setFitToPage(true);
      }
      setFileName(`CloneCAD_${space === 'model' ? 'Model' : layout?.name || 'Plot'}_${Date.now()}.pdf`);
    }
  }, [isOpen, core]);

  const selectedScaleRatio = useMemo(() => {
    const found = STANDARD_SCALES.find((s) => s.name === scaleName);
    return found ? found.ratio : 0.02;
  }, [scaleName]);

  const plotConfig: PlotConfig = useMemo(() => {
    return {
      layoutId: plotArea === 'layout' ? targetLayoutId : undefined,
      plotArea,
      paperSize,
      orientation,
      plotStyleTable,
      fitToPage,
      scale: selectedScaleRatio,
      centerPlot: true,
      fileName,
    };
  }, [plotArea, targetLayoutId, paperSize, orientation, plotStyleTable, fitToPage, selectedScaleRatio, fileName]);

  // Generate real-time SVG preview markup
  const previewSvg = useMemo(() => {
    if (!isOpen) return '';
    try {
      return core.getPDFPlotter().generateSVG(plotConfig, core.getEntities(), core.getLayers());
    } catch {
      return '';
    }
  }, [core, plotConfig, isOpen]);

  const handleApplyToLayout = () => {
    if (targetLayoutId) {
      core.updateLayout(targetLayoutId, {
        paperSize,
        orientation,
        plotStyleTable,
      });
      core.logCommandMessage(`Configurações de página salvas no layout.`);
    }
  };

  const handleDownloadPDF = () => {
    handleApplyToLayout();
    core.downloadPlotPDF(plotConfig);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2227] border border-[#2c313a] rounded-lg shadow-2xl w-[940px] max-w-full flex flex-col overflow-hidden text-[#abb2bf] font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#181a1f] border-b border-[#2c313a]">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-[#00e5ff]" />
            <h2 className="text-sm font-semibold text-white">Plotar - Configuração de Impressão e PDF</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4 max-h-[80vh]">
          {/* Left Form Column */}
          <div className="w-[420px] flex flex-col gap-3 overflow-y-auto pr-1">
            {/* 1. Target Sheet / Layout */}
            <div className="bg-[#21252b] p-3 rounded border border-[#2c313a]">
              <label className="text-xs font-semibold text-white mb-1.5 block">Destino da Plotagem</label>
              <div className="flex gap-2">
                <select
                  value={targetLayoutId}
                  onChange={(e) => setTargetLayoutId(e.target.value)}
                  disabled={plotArea !== 'layout'}
                  className="flex-1 bg-[#181a1f] border border-[#2c313a] text-xs px-2 py-1.5 rounded text-white outline-none disabled:opacity-50"
                >
                  {core.getLayouts().map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.paperSize})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Paper Size & Orientation */}
            <div className="bg-[#21252b] p-3 rounded border border-[#2c313a]">
              <label className="text-xs font-semibold text-white mb-2 block">Tamanho da Folha & Orientação</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Formato Normalizado</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                    className="w-full bg-[#181a1f] border border-[#2c313a] text-xs px-2 py-1.5 rounded text-white outline-none"
                  >
                    <option value="A0">A0 (1189 x 841 mm)</option>
                    <option value="A1">A1 (841 x 594 mm)</option>
                    <option value="A2">A2 (594 x 420 mm)</option>
                    <option value="A3">A3 (420 x 297 mm)</option>
                    <option value="A4">A4 (210 x 297 mm)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Orientação</label>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as PaperOrientation)}
                    className="w-full bg-[#181a1f] border border-[#2c313a] text-xs px-2 py-1.5 rounded text-white outline-none"
                  >
                    <option value="landscape">Paisagem (Landscape)</option>
                    <option value="portrait">Retrato (Portrait)</option>
                  </select>
                </div>
              </div>
              <div className="text-[11px] text-gray-400">
                Dimensões efetivas: {STANDARD_PAPER_SIZES[paperSize !== 'CUSTOM' ? paperSize : 'A1'].width} x{' '}
                {STANDARD_PAPER_SIZES[paperSize !== 'CUSTOM' ? paperSize : 'A1'].height} mm (Margem encadernação 25mm)
              </div>
            </div>

            {/* 3. Plot Style Table (CTB) */}
            <div className="bg-[#21252b] p-3 rounded border border-[#2c313a]">
              <label className="text-xs font-semibold text-white mb-1.5 block">Tabela de Estilo de Plotagem (CTB)</label>
              <select
                value={plotStyleTable}
                onChange={(e) => setPlotStyleTable(e.target.value)}
                className="w-full bg-[#181a1f] border border-[#2c313a] text-xs px-2 py-1.5 rounded text-white outline-none mb-1.5"
              >
                {core.getPlotStyleTables().map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400">
                {core.getPlotStyleManager().getTable(plotStyleTable)?.description}
              </p>
            </div>

            {/* 4. Plot Area & Scale */}
            <div className="bg-[#21252b] p-3 rounded border border-[#2c313a]">
              <label className="text-xs font-semibold text-white mb-2 block">Área & Escala de Impressão</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">O que plotar:</label>
                  <select
                    value={plotArea}
                    onChange={(e) => setPlotArea(e.target.value as PlotArea)}
                    className="w-full bg-[#181a1f] border border-[#2c313a] text-xs px-2 py-1.5 rounded text-white outline-none"
                  >
                    <option value="layout">Prancha do Layout</option>
                    <option value="extents">Limites do Modelo (Extents)</option>
                    <option value="display">Exibição da Viewport (Display)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Escala da Prancha</label>
                  <select
                    value={scaleName}
                    onChange={(e) => setScaleName(e.target.value)}
                    disabled={fitToPage}
                    className="w-full bg-[#181a1f] border border-[#2c313a] text-xs px-2 py-1.5 rounded text-white outline-none disabled:opacity-50"
                  >
                    {STANDARD_SCALES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitToPage}
                  onChange={(e) => setFitToPage(e.target.checked)}
                  className="rounded border-[#2c313a] text-[#007acc]"
                />
                Ajustar ao tamanho do papel (Fit to page)
              </label>
            </div>

            {/* 5. PDF Filename */}
            <div className="bg-[#21252b] p-3 rounded border border-[#2c313a]">
              <label className="text-[10px] text-gray-400 block mb-1">Nome do Arquivo PDF Gerado</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full bg-[#181a1f] border border-[#2c313a] text-xs px-2.5 py-1.5 rounded text-white outline-none"
              />
            </div>
          </div>

          {/* Right Preview Column */}
          <div className="flex-1 flex flex-col bg-[#14171a] rounded border border-[#2c313a] overflow-hidden">
            <div className="px-3 py-2 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <Eye size={13} className="text-[#00e5ff]" /> Pré-visualização Vetorial da Folha
              </span>
              <span className="text-[11px] text-gray-500">Escala Real 1:1</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
              {previewSvg ? (
                <div
                  className="max-w-full max-h-full drop-shadow-2xl overflow-hidden flex items-center justify-center border border-gray-300 bg-white"
                  style={{ maxHeight: '420px' }}
                  dangerouslySetInnerHTML={{ __html: previewSvg }}
                />
              ) : (
                <div className="text-gray-500 text-xs">Carregando pré-visualização vetorial...</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#181a1f] border-t border-[#2c313a]">
          <button
            onClick={handleApplyToLayout}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-[#21252b] hover:bg-[#2c313a] rounded transition-colors flex items-center gap-1.5"
          >
            <Check size={13} /> Salvar no Layout
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-gray-400 hover:text-white bg-transparent hover:bg-[#2c313a] rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 text-xs text-white bg-[#007acc] hover:bg-[#0098ff] font-medium rounded transition-colors flex items-center gap-1.5 shadow"
            >
              <Download size={14} /> Plotar / Baixar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
