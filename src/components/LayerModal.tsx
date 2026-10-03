import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADLayer } from '../core/types';
import { Layers, Plus, Trash2, Eye, EyeOff, Lock, Unlock, X, Check } from 'lucide-react';

interface LayerModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const LayerModal: React.FC<LayerModalProps> = ({ core, isOpen, onClose }) => {
  const [layers, setLayers] = useState<CADLayer[]>(core.getLayers());
  const [activeLayerId, setActiveLayerId] = useState<string>(core.getActiveLayer().id);
  const [newLayerName, setNewLayerName] = useState<string>('');

  useEffect(() => {
    const unsub = core.on('layer:changed', () => {
      setLayers(core.getLayers());
      setActiveLayerId(core.getActiveLayer().id);
    });
    return unsub;
  }, [core]);

  if (!isOpen) return null;

  const handleAddLayer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLayerName.trim();
    if (!name) return;

    const colors = ['#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff'];
    const randomColor = colors[layers.length % colors.length];

    const newLayer: CADLayer = {
      id: `layer_${Date.now()}`,
      name,
      color: randomColor,
      visible: true,
      locked: false,
      lineWeight: 1,
      lineType: 'continuous',
    };

    core.addLayer(newLayer);
    core.setActiveLayer(newLayer.id);
    setNewLayerName('');
  };

  const toggleVisibility = (layer: CADLayer) => {
    core.updateLayer({ ...layer, visible: !layer.visible });
  };

  const toggleLock = (layer: CADLayer) => {
    core.updateLayer({ ...layer, locked: !layer.locked });
  };

  const handleColorChange = (layer: CADLayer, color: string) => {
    core.updateLayer({ ...layer, color });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#21252b] border border-[#3a3f4b] rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col font-sans text-xs">
        {/* Modal Header */}
        <div className="h-10 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Layers size={16} className="text-[#007acc]" />
            <span>Layer Properties Manager</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#abb2bf] hover:text-white p-1 rounded hover:bg-[#282c34]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Create Layer Toolbar */}
        <div className="p-3 bg-[#282c34] border-b border-[#3a3f4b] flex items-center gap-2">
          <form onSubmit={handleAddLayer} className="flex-1 flex gap-2">
            <input
              type="text"
              value={newLayerName}
              onChange={(e) => setNewLayerName(e.target.value)}
              placeholder="New layer name (e.g. Walls, Dimensions, Hidden)..."
              className="flex-1 bg-[#181a1f] border border-[#3a3f4b] text-[#e5e9f0] px-3 py-1 rounded outline-none font-mono text-xs"
            />
            <button
              type="submit"
              className="bg-[#007acc] hover:bg-[#0098ff] text-white px-3 py-1 rounded flex items-center gap-1.5 font-medium transition-colors"
            >
              <Plus size={14} />
              New Layer
            </button>
          </form>
        </div>

        {/* Table of Layers */}
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1b1e23] text-[#5c6370] uppercase tracking-wider text-[10px] border-b border-[#3a3f4b]">
                <th className="py-2 px-3 w-8 text-center">Status</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3 text-center w-12">On/Off</th>
                <th className="py-2 px-3 text-center w-12">Lock</th>
                <th className="py-2 px-3 w-20">Color</th>
                <th className="py-2 px-3 text-center w-12">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2c313a] text-[#abb2bf]">
              {layers.map((layer) => {
                const isActive = layer.id === activeLayerId;
                return (
                  <tr
                    key={layer.id}
                    onClick={() => core.setActiveLayer(layer.id)}
                    className={`hover:bg-[#282c34] cursor-pointer transition-colors ${
                      isActive ? 'bg-[#282c34]/70 font-semibold text-white' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      {isActive && <Check size={14} className="text-[#98c379] mx-auto" />}
                    </td>
                    <td className="py-2 px-3 font-mono">{layer.name}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(layer);
                        }}
                        className="text-[#abb2bf] hover:text-white"
                        title={layer.visible ? 'Turn layer OFF' : 'Turn layer ON'}
                      >
                        {layer.visible ? (
                          <Eye size={14} className="text-[#e5c07b]" />
                        ) : (
                          <EyeOff size={14} className="text-[#5c6370]" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(layer);
                        }}
                        className="text-[#abb2bf] hover:text-white"
                        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      >
                        {layer.locked ? (
                          <Lock size={14} className="text-[#e06c75]" />
                        ) : (
                          <Unlock size={14} className="text-[#5c6370]" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => handleColorChange(layer, e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border border-[#3a3f4b] bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-[#abb2bf]">{layer.color}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {layer.id !== '0' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            core.removeLayer(layer.id);
                          }}
                          className="text-[#5c6370] hover:text-[#e06c75] p-1 rounded"
                          title="Delete Layer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="h-10 bg-[#181a1f] border-t border-[#2c313a] flex items-center justify-end px-4 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#282c34] hover:bg-[#353b45] text-white rounded transition-colors text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
