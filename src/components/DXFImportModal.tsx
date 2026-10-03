import React, { useState, useRef } from 'react';
import { CADCore } from '../core/CADCore';
import { DWGHeaderReader } from '../core/interop/DWGHeaderReader';
import { DXFParser } from '../core/interop/DXFParser';
import { X, UploadCloud, FileCode, CheckCircle2, AlertTriangle, Layers, Shapes } from 'lucide-react';

interface DXFImportModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const DXFImportModal: React.FC<DXFImportModalProps> = ({ core, isOpen, onClose }) => {
  const [dxfText, setDxfText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [scale, setScale] = useState<number>(1.0);
  const [clearExisting, setClearExisting] = useState<boolean>(false);
  const [dwgWarning, setDwgWarning] = useState<string | null>(null);
  const [parseSummary, setParseSummary] = useState<{ entities: number; layers: number; blocks: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setDwgWarning(null);
    setParseSummary(null);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    if (file.name.toLowerCase().endsWith('.dwg')) {
      const buffer = await file.arrayBuffer();
      const dwgInfo = DWGHeaderReader.readHeader(buffer);
      if (dwgInfo.valid) {
        setDwgWarning(`Arquivo binário DWG detectado (${dwgInfo.versionCode} - ${dwgInfo.releaseYear || 'AutoCAD'}). O formato binário DWG proprietário é protegido pela Autodesk. Exporte ou salve seu arquivo como DXF (AutoCAD R12 a 2026) para importação vetorial direta no navegador.`);
      } else {
        setDwgWarning('Arquivo DWG com cabeçalho inválido ou corrompido.');
      }
      setDxfText('');
      return;
    }

    const text = await file.text();
    setDxfText(text);

    try {
      const parser = new DXFParser();
      const res = parser.parse(text);
      setParseSummary({
        entities: res.entities.length,
        layers: res.layers.length,
        blocks: res.blocks.length,
      });
    } catch (err: any) {
      console.warn('Preview parse error:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleImport = () => {
    if (!dxfText) return;
    core.importDXF(dxfText, { clearExisting, scale });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#21252b] border border-[#3e4451] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#abb2bf]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#282c34] border-b border-[#3e4451]">
          <div className="flex items-center gap-2 text-white font-medium">
            <FileCode className="w-5 h-5 text-[#61afef]" />
            <span>Importar Arquivo CAD (DXF / DWG)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#3e4451] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-[#61afef] bg-[#61afef]/10' : 'border-[#3e4451] hover:border-[#61afef]/60 bg-[#1e2227]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf,.dwg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <UploadCloud className="w-10 h-10 text-[#61afef] mx-auto mb-2 opacity-80" />
            <p className="text-sm font-medium text-white">Arraste seu arquivo DXF ou DWG aqui</p>
            <p className="text-xs text-gray-400 mt-1">Suporta DXF ASCII R12 até AutoCAD 2026 (.dxf, .dwg)</p>
          </div>

          {/* DWG Notice */}
          {dwgWarning && (
            <div className="p-3.5 bg-[#e5c07b]/10 border border-[#e5c07b]/30 rounded-lg text-xs text-[#e5c07b] flex gap-2.5 items-start">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>{dwgWarning}</div>
            </div>
          )}

          {/* File summary */}
          {fileName && parseSummary && (
            <div className="p-4 bg-[#1e2227] border border-[#3e4451] rounded-lg space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[#2c313a] pb-2">
                <span className="text-white font-medium">{fileName}</span>
                <span className="text-gray-400">{fileSize}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-[#282c34] rounded">
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Shapes className="w-3.5 h-3.5 text-[#98c379]" /> Entidades
                  </div>
                  <div className="text-base font-bold text-white mt-1">{parseSummary.entities}</div>
                </div>
                <div className="p-2 bg-[#282c34] rounded">
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#61afef]" /> Camadas
                  </div>
                  <div className="text-base font-bold text-white mt-1">{parseSummary.layers}</div>
                </div>
                <div className="p-2 bg-[#282c34] rounded">
                  <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#c678dd]" /> Blocos
                  </div>
                  <div className="text-base font-bold text-white mt-1">{parseSummary.blocks}</div>
                </div>
              </div>
            </div>
          )}

          {/* Import options */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Escala de Importação</label>
                <select
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#61afef]"
                >
                  <option value={1.0}>1.0 (Manter unidades originais)</option>
                  <option value={0.001}>0.001 (Milímetros para Metros)</option>
                  <option value={1000}>1000 (Metros para Milímetros)</option>
                  <option value={25.4}>25.4 (Polegadas para Milímetros)</option>
                  <option value={0.0254}>0.0254 (Polegadas para Metros)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Destino na Cena</label>
                <select
                  value={clearExisting ? 'replace' : 'merge'}
                  onChange={(e) => setClearExisting(e.target.value === 'replace')}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#61afef]"
                >
                  <option value="merge">Mesclar com desenho atual</option>
                  <option value="replace">Limpar cena e substituir</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#282c34] border-t border-[#3e4451]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-300 hover:text-white bg-[#3e4451]/50 hover:bg-[#3e4451] rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!dxfText}
            className="px-5 py-2 text-xs font-medium text-white bg-[#61afef] hover:bg-[#4d97d5] disabled:opacity-40 disabled:cursor-not-allowed rounded shadow transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Importar Entidades
          </button>
        </div>
      </div>
    </div>
  );
};
