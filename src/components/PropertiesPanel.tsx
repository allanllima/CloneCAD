import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADEntity, CADLayer } from '../core/types';
import { ModifyEntityCommand } from '../commands/ModifyEntityCommand';
import { PolygonBooleanUtils } from '../core/geometry/PolygonBooleanUtils';
import { X, Sliders } from 'lucide-react';

interface PropertiesPanelProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ core, isOpen, onClose }) => {
  const [selectedEntities, setSelectedEntities] = useState<CADEntity[]>(core.getSelectedEntities());
  const [layers, setLayers] = useState<CADLayer[]>(core.getLayers());

  useEffect(() => {
    const unsubSel = core.on('selection:changed', (selected: CADEntity[]) => {
      setSelectedEntities(selected || []);
    });

    const unsubLayers = core.on('layer:changed', () => {
      setLayers(core.getLayers());
    });

    return () => {
      unsubSel();
      unsubLayers();
    };
  }, [core]);

  if (!isOpen) return null;

  const entity = selectedEntities.length === 1 ? selectedEntities[0] : null;

  const handleUpdate = (updated: Partial<CADEntity>) => {
    if (!entity) return;
    const next = { ...entity, ...updated } as CADEntity;
    const cmd = new ModifyEntityCommand(core, entity, next, `MODIFY ${entity.type.toUpperCase()}`);
    core.executeCommand(cmd);
  };

  return (
    <div className="w-72 bg-[#1e2227] border-l border-[#2c313a] flex flex-col font-sans text-xs select-none z-30 shadow-2xl">
      {/* Header */}
      <div className="h-8 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5 text-[#e5e9f0] font-semibold text-xs">
          <Sliders size={14} className="text-[#61afef]" />
          <span>Properties</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#abb2bf] hover:text-white p-1 rounded hover:bg-[#282c34]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedEntities.length === 0 ? (
          <div className="text-center py-10 text-[#5c6370]">
            <p>No objects selected</p>
            <p className="text-[11px] mt-1">Select an entity to inspect and modify properties.</p>
          </div>
        ) : selectedEntities.length > 1 ? (
          <div className="p-3 bg-[#21252b] rounded border border-[#3a3f4b]">
            <span className="font-semibold text-white">
              {selectedEntities.length} Objects Selected
            </span>
            <p className="text-[#abb2bf] text-[11px] mt-1">
              Multiple selection. Deselect or select single object to view geometry.
            </p>
          </div>
        ) : entity && (
          <div className="space-y-4">
            {/* General Section */}
            <div className="bg-[#21252b] rounded border border-[#3a3f4b] p-2.5 space-y-2">
              <div className="font-semibold text-[#61afef] border-b border-[#3a3f4b] pb-1 uppercase tracking-wider text-[10px]">
                General
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#abb2bf]">Entity Type</span>
                <span className="font-mono text-[#e5e9f0] font-semibold uppercase">
                  {entity.type}
                </span>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#abb2bf]">Layer</span>
                <select
                  value={entity.layerId}
                  onChange={(e) => handleUpdate({ layerId: e.target.value })}
                  className="bg-[#181a1f] border border-[#3a3f4b] text-[#e5e9f0] text-[11px] rounded px-2 py-0.5 font-mono outline-none"
                >
                  {layers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center py-0.5">
                <span className="text-[#abb2bf]">Color</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={entity.color || '#ffffff'}
                    onChange={(e) => handleUpdate({ color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border border-[#3a3f4b] bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-[#e5e9f0]">
                    {entity.color || 'ByLayer'}
                  </span>
                </div>
              </div>
            </div>

            {/* Geometry Specific Section */}
            <div className="bg-[#21252b] rounded border border-[#3a3f4b] p-2.5 space-y-2">
              <div className="font-semibold text-[#98c379] border-b border-[#3a3f4b] pb-1 uppercase tracking-wider text-[10px]">
                Geometry
              </div>

              {entity.type === 'line' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Start X</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).start.x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Start Y</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).start.y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">End X</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).end.x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">End Y</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).end.y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-[#3a3f4b] pt-1">
                    <span className="text-[#abb2bf]">Length</span>
                    <span className="font-mono text-[#e5c07b] font-semibold">
                      {Math.hypot(
                        (entity as any).end.x - (entity as any).start.x,
                        (entity as any).end.y - (entity as any).start.y
                      ).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {entity.type === 'circle' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Center X</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).center.x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Center Y</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).center.y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Radius</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={Math.round((entity as any).radius)}
                      onChange={(e) => handleUpdate({ radius: Math.max(1, parseFloat(e.target.value) || 1) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-[#3a3f4b] pt-1">
                    <span className="text-[#abb2bf]">Diameter</span>
                    <span className="font-mono text-[#e5e9f0]">{((entity as any).radius * 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Circumference</span>
                    <span className="font-mono text-[#e5e9f0]">{((entity as any).radius * 2 * Math.PI).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Area</span>
                    <span className="font-mono text-[#e5e9f0]">{((entity as any).radius * (entity as any).radius * Math.PI).toFixed(2)}</span>
                  </div>
                </>
              )}

              {entity.type === 'rectangle' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Origin X</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).origin.x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Origin Y</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).origin.y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Width</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={Math.round((entity as any).width)}
                      onChange={(e) => handleUpdate({ width: Math.max(1, parseFloat(e.target.value) || 1) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Height</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={Math.round((entity as any).height)}
                      onChange={(e) => handleUpdate({ height: Math.max(1, parseFloat(e.target.value) || 1) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-[#3a3f4b] pt-1">
                    <span className="text-[#abb2bf]">Area</span>
                    <span className="font-mono text-[#e5e9f0]">
                      {((entity as any).width * (entity as any).height).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {entity.type === 'polyline' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Vertices</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).points?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Closed</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).closed ? 'Yes' : 'No'}</span>
                  </div>
                </>
              )}

              {entity.type === 'arc' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Center X</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).center.x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Center Y</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).center.y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Radius</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).radius.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Start Angle</span>
                    <span className="font-mono text-[#e5e9f0]">{((entity as any).startAngle * 180 / Math.PI).toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">End Angle</span>
                    <span className="font-mono text-[#e5e9f0]">{((entity as any).endAngle * 180 / Math.PI).toFixed(1)}°</span>
                  </div>
                </>
              )}

              {entity.type === 'spline' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Control Points</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).controlPoints?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Degree</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).degree || 3}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Closed</span>
                    <button
                      onClick={() => handleUpdate({ closed: !(entity as any).closed } as any)}
                      className="px-2 py-0.5 bg-[#181a1f] border border-[#3a3f4b] rounded text-[#e5c07b] font-mono text-[11px]"
                    >
                      {(entity as any).closed ? 'Yes' : 'No'}
                    </button>
                  </div>
                </>
              )}

              {entity.type === 'ellipse' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Center X</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).center.x.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Center Y</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).center.y.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Major Radius</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={Math.round((entity as any).radiusX)}
                      onChange={(e) => handleUpdate({ radiusX: Math.max(1, parseFloat(e.target.value) || 1) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Minor Radius</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={Math.round((entity as any).radiusY)}
                      onChange={(e) => handleUpdate({ radiusY: Math.max(1, parseFloat(e.target.value) || 1) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-[#3a3f4b] pt-1">
                    <span className="text-[#abb2bf]">Rotation</span>
                    <span className="font-mono text-[#e5e9f0]">
                      {(((entity as any).rotation * 180) / Math.PI).toFixed(1)}°
                    </span>
                  </div>
                </>
              )}

              {entity.type === 'hatch' && (
                <>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Pattern</span>
                    <select
                      value={(entity as any).pattern}
                      onChange={(e) => handleUpdate({ pattern: e.target.value } as any)}
                      className="bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-[11px] outline-none"
                    >
                      <option value="SOLID">SOLID</option>
                      <option value="ANSI31">ANSI31</option>
                      <option value="ANSI32">ANSI32</option>
                      <option value="GRID">GRID</option>
                      <option value="DOTS">DOTS</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Scale</span>
                    <input
                      type="number"
                      step="1"
                      min="2"
                      value={(entity as any).scale || 10}
                      onChange={(e) => handleUpdate({ scale: Math.max(2, parseFloat(e.target.value) || 10) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Vertices</span>
                    <span className="font-mono text-[#e5e9f0]">{(entity as any).boundary?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-t border-[#3a3f4b] pt-1">
                    <span className="text-[#abb2bf]">Area</span>
                    <span className="font-mono text-[#e5c07b] font-semibold">
                      {PolygonBooleanUtils.calculateArea((entity as any).boundary || []).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {entity.type === 'text' && (
                <>
                  <div className="flex flex-col py-0.5 gap-1">
                    <span className="text-[#abb2bf]">Text Content</span>
                    <input
                      type="text"
                      value={(entity as any).text}
                      onChange={(e) => handleUpdate({ text: e.target.value } as any)}
                      className="bg-[#181a1f] border border-[#3a3f4b] text-[#e5e9f0] font-mono px-2 py-1 rounded outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[#abb2bf]">Font Size</span>
                    <input
                      type="number"
                      step="1"
                      min="6"
                      value={(entity as any).fontSize}
                      onChange={(e) => handleUpdate({ fontSize: Math.max(6, parseFloat(e.target.value) || 12) } as any)}
                      className="w-20 bg-[#181a1f] border border-[#3a3f4b] text-[#e5c07b] font-mono px-1.5 py-0.5 rounded text-right outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
