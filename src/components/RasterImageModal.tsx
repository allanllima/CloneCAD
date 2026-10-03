import React, { useState, useRef } from 'react';
import { CADCore } from '../core/CADCore';
import { X, Image as ImageIcon, UploadCloud, CheckCircle2, Sliders, Ruler } from 'lucide-react';

interface RasterImageModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const RasterImageModal: React.FC<RasterImageModalProps> = ({ core, isOpen, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [width, setWidth] = useState<number>(500);
  const [height, setHeight] = useState<number>(300);
  const [aspectRatio, setAspectRatio] = useState<number>(500 / 300);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(0.8);
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [layerId, setLayerId] = useState<string>(core.getActiveLayer()?.id || '0');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageUrl(result);

      // Measure natural dimensions
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 500;
        const naturalH = img.naturalHeight || 300;
        setWidth(naturalW);
        setHeight(naturalH);
        setAspectRatio(naturalW / naturalH);

        // Center on current viewport
        const vp = core.getViewport();
        setPosX(Math.round(vp.cameraX));
        setPosY(Math.round(vp.cameraY));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspect && aspectRatio > 0) {
      setHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspect && aspectRatio > 0) {
      setWidth(Math.round(val * aspectRatio));
    }
  };

  const handleAttach = () => {
    if (!imageUrl) return;

    core.attachRasterImage({
      url: imageUrl,
      name: imageName || 'Raster Image',
      position: { x: posX, y: posY },
      width,
      height,
      opacity,
      layerId,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#21252b] border border-[#3e4451] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#abb2bf]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#282c34] border-b border-[#3e4451]">
          <div className="flex items-center gap-2 text-white font-medium">
            <ImageIcon className="w-5 h-5 text-[#98c379]" />
            <span>Anexar Imagem Raster (IMAGEATTACH)</span>
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
          {/* File Picker / Preview */}
          {!imageUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#3e4451] hover:border-[#98c379]/70 bg-[#1e2227] rounded-lg p-6 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
              <UploadCloud className="w-10 h-10 text-[#98c379] mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-white">Clique para selecionar imagem de referência</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP ou SVG para croquis, plantas baixas ou topografia</p>
            </div>
          ) : (
            <div className="flex gap-4 p-3 bg-[#1e2227] border border-[#3e4451] rounded-lg items-center">
              <div className="w-24 h-24 bg-black/40 rounded overflow-hidden flex items-center justify-center border border-[#3e4451] flex-shrink-0">
                <img src={imageUrl} alt="preview" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0 text-xs space-y-1">
                <div className="text-white font-medium truncate">{imageName}</div>
                <div className="text-gray-400">Resolução nativa: {width} x {height} px</div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#61afef] hover:underline pt-1 inline-block"
                >
                  Substituir imagem...
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
              </div>
            </div>
          )}

          {/* Properties */}
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Largura (Unidades CAD)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#98c379]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Altura (Unidades CAD)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#98c379]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Posição X (Origem)</label>
                <input
                  type="number"
                  value={posX}
                  onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#98c379]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Posição Y (Origem)</label>
                <input
                  type="number"
                  value={posY}
                  onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#98c379]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Opacidade: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-full accent-[#98c379]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Camada (Layer)</label>
                <select
                  value={layerId}
                  onChange={(e) => setLayerId(e.target.value)}
                  className="w-full bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#98c379]"
                >
                  {core.getLayers().map((ly) => (
                    <option key={ly.id} value={ly.id}>{ly.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scale Calibration Tip */}
            <div className="p-3 bg-[#282c34] border border-[#3e4451] rounded-lg text-xs text-gray-400 flex items-start gap-2.5">
              <Ruler className="w-4 h-4 text-[#98c379] flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-medium">Calibração de Escala:</span> Uma vez inserida na cena, você pode calibrar a escala exata da imagem com dois cliques sobre uma cota ou escala gráfica conhecida.
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
            onClick={handleAttach}
            disabled={!imageUrl}
            className="px-5 py-2 text-xs font-medium text-white bg-[#98c379] hover:bg-[#85b565] disabled:opacity-40 disabled:cursor-not-allowed rounded shadow transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Inserir na Cena
          </button>
        </div>
      </div>
    </div>
  );
};
