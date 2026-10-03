import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADDimStyle } from '../core/types';
import { Ruler, X, Plus, Check, Trash2 } from 'lucide-react';

interface DimStyleModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const DimStyleModal: React.FC<DimStyleModalProps> = ({ core, isOpen, onClose }) => {
  const [styles, setStyles] = useState<CADDimStyle[]>(core.getDimStyles());
  const [selectedId, setSelectedId] = useState<string>(core.getActiveDimStyle().id);
  const [editingStyle, setEditingStyle] = useState<CADDimStyle>({ ...core.getActiveDimStyle() });
  const [activeTab, setActiveTab] = useState<'lines_arrows' | 'text' | 'units' | 'tolerances'>('lines_arrows');

  useEffect(() => {
    if (isOpen) {
      const all = core.getDimStyles();
      setStyles(all);
      const active = core.getActiveDimStyle();
      setSelectedId(active.id);
      setEditingStyle({ ...active });
    }
  }, [isOpen, core]);

  if (!isOpen) return null;

  const handleSelectStyle = (id: string) => {
    setSelectedId(id);
    const s = core.getDimStyles().find((x) => x.id === id);
    if (s) {
      setEditingStyle({ ...s });
    }
  };

  const handleSetCurrent = () => {
    core.setActiveDimStyle(selectedId);
    core.logCommandMessage(`Active Dimension Style set to "${editingStyle.name}".`);
    onClose();
  };

  const handleCreateNew = () => {
    const newName = prompt('Enter name for new Dimension Style:', `${editingStyle.name} Copy`);
    if (!newName) return;
    const newId = `dimstyle_${Date.now()}`;
    const newStyle: CADDimStyle = {
      ...editingStyle,
      id: newId,
      name: newName.trim(),
    };
    core.addDimStyle(newStyle);
    setStyles(core.getDimStyles());
    setSelectedId(newId);
    setEditingStyle({ ...newStyle });
  };

  const handleSaveEdits = () => {
    core.updateDimStyle(editingStyle.id, editingStyle);
    setStyles(core.getDimStyles());
    core.logCommandMessage(`Dimension Style "${editingStyle.name}" updated.`);
  };

  const handleDeleteStyle = (id: string) => {
    if (id === 'standard') {
      alert('The "Standard" dimension style cannot be deleted.');
      return;
    }
    if (confirm('Delete this dimension style?')) {
      core.deleteDimStyle(id);
      setStyles(core.getDimStyles());
      setSelectedId('standard');
      const std = core.getDimStyles().find((x) => x.id === 'standard');
      if (std) setEditingStyle({ ...std });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#21252b] border border-[#3a3f4b] rounded-lg shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden text-[#abb2bf] font-sans text-xs">
        {/* Header */}
        <div className="bg-[#181a1f] px-4 py-2.5 border-b border-[#2c313a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#e5e9f0] font-semibold text-sm">
            <Ruler size={18} className="text-[#61afef]" />
            <span>Dimension Style Manager (DIMSTYLE)</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#5c6370] hover:text-white p-1 rounded hover:bg-[#282c34]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden min-h-[420px]">
          {/* Left: Styles list */}
          <div className="w-56 bg-[#1b1e23] border-r border-[#2c313a] p-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#5c6370] tracking-wider block mb-2">
                Available Styles
              </span>
              {styles.map((s) => {
                const isCurrent = core.getActiveDimStyle().id === s.id;
                const isSelected = selectedId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectStyle(s.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#007acc] text-white font-medium'
                        : 'hover:bg-[#282c34] text-[#abb2bf]'
                    }`}
                  >
                    <div className="truncate flex items-center gap-1.5">
                      {isCurrent && <Check size={12} className={isSelected ? 'text-white' : 'text-[#98c379]'} />}
                      <span className="truncate">{s.name}</span>
                    </div>
                    {s.id !== 'standard' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStyle(s.id);
                        }}
                        className="opacity-60 hover:opacity-100 hover:text-[#e06c75] p-0.5"
                        title="Delete Style"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#2c313a] space-y-1.5">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#282c34] hover:bg-[#353b45] text-[#e5e9f0] rounded border border-[#3a3f4b]"
              >
                <Plus size={13} />
                <span>New Style...</span>
              </button>
              <button
                onClick={handleSetCurrent}
                className="w-full py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium rounded"
              >
                Set Current
              </button>
            </div>
          </div>

          {/* Right: Tabbed Configuration & Live Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#21252b]">
            {/* Tabs */}
            <div className="flex border-b border-[#2c313a] bg-[#1e2227] px-3 pt-2 gap-1">
              {[
                { id: 'lines_arrows', label: 'Lines & Arrows' },
                { id: 'text', label: 'Text & Format' },
                { id: 'units', label: 'Primary Units' },
                { id: 'tolerances', label: 'Tolerances' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-t text-xs transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#21252b] text-[#61afef] border-t-2 border-[#61afef] font-medium'
                      : 'text-[#5c6370] hover:text-[#abb2bf]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Form Content */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {activeTab === 'lines_arrows' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 bg-[#181a1f] p-3 rounded border border-[#2c313a]">
                    <span className="font-semibold text-[#61afef] block border-b border-[#2c313a] pb-1">
                      Arrowheads
                    </span>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Arrow Type</label>
                      <select
                        value={editingStyle.arrowType}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, arrowType: e.target.value as any })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      >
                        <option value="arrow">Closed Filled Arrow</option>
                        <option value="tick">Architectural Tick (45° Slash)</option>
                        <option value="dot">Dot / Circle Marker</option>
                        <option value="open">Open Arrow</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Arrow Size</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingStyle.arrowSize}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, arrowSize: parseFloat(e.target.value) || 2.5 })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-[#181a1f] p-3 rounded border border-[#2c313a]">
                    <span className="font-semibold text-[#61afef] block border-b border-[#2c313a] pb-1">
                      Extension Lines
                    </span>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Extend beyond dim lines (dimexe)</label>
                      <input
                        type="number"
                        step="0.25"
                        value={editingStyle.extensionLineExtension}
                        onChange={(e) =>
                          setEditingStyle({
                            ...editingStyle,
                            extensionLineExtension: parseFloat(e.target.value) || 1.25,
                          })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Offset from origin (dimexo)</label>
                      <input
                        type="number"
                        step="0.25"
                        value={editingStyle.extensionLineOffset}
                        onChange={(e) =>
                          setEditingStyle({
                            ...editingStyle,
                            extensionLineOffset: parseFloat(e.target.value) || 0.625,
                          })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 bg-[#181a1f] p-3 rounded border border-[#2c313a]">
                    <span className="font-semibold text-[#61afef] block border-b border-[#2c313a] pb-1">
                      Text Appearance
                    </span>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Text Height</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingStyle.textHeight}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, textHeight: parseFloat(e.target.value) || 2.5 })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Offset from dimension line</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingStyle.textOffset}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, textOffset: parseFloat(e.target.value) || 1.0 })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 bg-[#181a1f] p-3 rounded border border-[#2c313a]">
                    <span className="font-semibold text-[#61afef] block border-b border-[#2c313a] pb-1">
                      Prefix & Suffix
                    </span>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Prefix (e.g. "DIM ")</label>
                      <input
                        type="text"
                        value={editingStyle.prefix || ''}
                        onChange={(e) => setEditingStyle({ ...editingStyle, prefix: e.target.value })}
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Suffix (e.g. " mm" or " m")</label>
                      <input
                        type="text"
                        value={editingStyle.suffix || ''}
                        onChange={(e) => setEditingStyle({ ...editingStyle, suffix: e.target.value })}
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'units' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3 bg-[#181a1f] p-3 rounded border border-[#2c313a]">
                    <span className="font-semibold text-[#61afef] block border-b border-[#2c313a] pb-1">
                      Linear Units
                    </span>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Unit Format</label>
                      <select
                        value={editingStyle.unit}
                        onChange={(e) => setEditingStyle({ ...editingStyle, unit: e.target.value as any })}
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      >
                        <option value="mm">Millimeters (mm)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="m">Meters (m)</option>
                        <option value="in">Inches (in)</option>
                        <option value="ft">Feet (ft)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Precision (Decimals)</label>
                      <select
                        value={editingStyle.precision}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, precision: parseInt(e.target.value, 10) })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      >
                        <option value={0}>0 (e.g. 100)</option>
                        <option value={1}>0.0 (e.g. 100.0)</option>
                        <option value={2}>0.00 (e.g. 100.00)</option>
                        <option value={3}>0.000 (e.g. 100.000)</option>
                        <option value={4}>0.0000 (e.g. 100.0000)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 bg-[#181a1f] p-3 rounded border border-[#2c313a]">
                    <span className="font-semibold text-[#61afef] block border-b border-[#2c313a] pb-1">
                      Measurement Scale
                    </span>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Decimal Separator</label>
                      <select
                        value={editingStyle.decimalSeparator || '.'}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, decimalSeparator: e.target.value as any })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      >
                        <option value=".">Period (.) [ISO/US]</option>
                        <option value=",">Comma (,) [ABNT/BR]</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[#5c6370] block mb-1">Scale Factor Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingStyle.scaleFactor}
                        onChange={(e) =>
                          setEditingStyle({ ...editingStyle, scaleFactor: parseFloat(e.target.value) || 1 })
                        }
                        className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tolerances' && (
                <div className="bg-[#181a1f] p-3 rounded border border-[#2c313a] space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tolEnabled"
                      checked={editingStyle.toleranceEnabled || false}
                      onChange={(e) =>
                        setEditingStyle({ ...editingStyle, toleranceEnabled: e.target.checked })
                      }
                      className="rounded accent-[#007acc]"
                    />
                    <label htmlFor="tolEnabled" className="font-semibold text-white">
                      Display Tolerances (Mechanical Drafting)
                    </label>
                  </div>

                  {editingStyle.toleranceEnabled && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="text-[#5c6370] block mb-1">Upper Value (+)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingStyle.toleranceUpper ?? 0}
                          onChange={(e) =>
                            setEditingStyle({ ...editingStyle, toleranceUpper: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[#5c6370] block mb-1">Lower Value (-)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingStyle.toleranceLower ?? 0}
                          onChange={(e) =>
                            setEditingStyle({ ...editingStyle, toleranceLower: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full bg-[#21252b] border border-[#3a3f4b] rounded px-2 py-1 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Preview Card */}
              <div className="bg-[#181a1f] p-3 rounded border border-[#2c313a] flex flex-col items-center">
                <span className="text-[10px] uppercase font-semibold text-[#5c6370] mb-2 self-start">
                  Live Style Sample Preview
                </span>
                <svg width="280" height="70" viewBox="0 0 280 70" className="bg-[#21252b] rounded border border-[#3a3f4b]">
                  {/* Extension lines */}
                  <line x1="40" y1="60" x2="40" y2="20" stroke="#61afef" strokeWidth="1.5" />
                  <line x1="240" y1="60" x2="240" y2="20" stroke="#61afef" strokeWidth="1.5" />
                  {/* Dimension line */}
                  <line x1="40" y1="28" x2="240" y2="28" stroke="#61afef" strokeWidth="1.5" />

                  {/* Arrowheads */}
                  {editingStyle.arrowType === 'tick' ? (
                    <>
                      <line x1="34" y1="34" x2="46" y2="22" stroke="#61afef" strokeWidth="2.5" />
                      <line x1="234" y1="34" x2="246" y2="22" stroke="#61afef" strokeWidth="2.5" />
                    </>
                  ) : editingStyle.arrowType === 'dot' ? (
                    <>
                      <circle cx="40" cy="28" r="3.5" fill="#61afef" />
                      <circle cx="240" cy="28" r="3.5" fill="#61afef" />
                    </>
                  ) : (
                    <>
                      <polygon points="40,28 52,24 52,32" fill="#61afef" />
                      <polygon points="240,28 228,24 228,32" fill="#61afef" />
                    </>
                  )}

                  {/* Dimension text */}
                  <rect x="100" y="14" width="80" height="18" fill="#21252b" />
                  <text
                    x="140"
                    y="27"
                    fill="#e5e9f0"
                    fontSize="11"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {core.getDimStyleManager().formatMeasurement(150, 'linear', editingStyle)}
                  </text>
                </svg>
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="bg-[#181a1f] px-4 py-2.5 border-t border-[#2c313a] flex items-center justify-between">
              <span className="text-[11px] text-[#5c6370]">
                Editing: <span className="text-white font-semibold">{editingStyle.name}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdits}
                  className="px-3 py-1.5 bg-[#282c34] hover:bg-[#353b45] text-[#e5e9f0] rounded border border-[#3a3f4b]"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleSetCurrent}
                  className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded font-medium"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
