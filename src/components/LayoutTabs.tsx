import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADLayout } from '../core/layout/LayoutTypes';
import { Plus, MoreVertical, Trash2, Edit3, Printer, FileText } from 'lucide-react';

interface LayoutTabsProps {
  core: CADCore;
  onOpenPlotModal: () => void;
}

export const LayoutTabs: React.FC<LayoutTabsProps> = ({ core, onOpenPlotModal }) => {
  const [activeSpace, setActiveSpace] = useState<'model' | string>(core.getActiveSpace());
  const [layouts, setLayouts] = useState<CADLayout[]>(core.getLayouts());
  const [menuLayoutId, setMenuLayoutId] = useState<string | null>(null);
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  useEffect(() => {
    const unsubLayout = core.on('layout:changed', () => {
      setLayouts(core.getLayouts());
      setActiveSpace(core.getActiveSpace());
    });
    const unsubSpace = core.on('space:changed', (s) => {
      setActiveSpace(s);
    });

    return () => {
      unsubLayout();
      unsubSpace();
    };
  }, [core]);

  const handleSelectSpace = (space: 'model' | string) => {
    core.setActiveSpace(space);
    setMenuLayoutId(null);
  };

  const handleCreateNewLayout = () => {
    const newL = core.createLayout();
    core.setActiveSpace(newL.id);
  };

  const handleDeleteLayout = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir esta prancha/layout?')) {
      core.deleteLayout(id);
      setMenuLayoutId(null);
    }
  };

  const handleStartRename = (layout: CADLayout, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayoutId(layout.id);
    setEditingName(layout.name);
    setMenuLayoutId(null);
  };

  const handleFinishRename = () => {
    if (editingLayoutId && editingName.trim()) {
      core.updateLayout(editingLayoutId, { name: editingName.trim() });
    }
    setEditingLayoutId(null);
  };

  return (
    <div className="flex items-center h-full bg-[#1b1e23] border-r border-[#2c313a] select-none text-[11px] font-sans">
      {/* Model Tab */}
      <button
        onClick={() => handleSelectSpace('model')}
        className={`h-full px-3 font-semibold flex items-center gap-1.5 transition-colors border-r border-[#2c313a] ${
          activeSpace === 'model'
            ? 'bg-[#21252b] text-white border-b-2 border-b-[#007acc]'
            : 'text-[#6c7280] hover:text-[#abb2bf] hover:bg-[#21252b]/50'
        }`}
        title="Model Space (Área de desenho infinito)"
      >
        <FileText size={12} className={activeSpace === 'model' ? 'text-[#007acc]' : 'text-gray-500'} />
        MODEL
      </button>

      {/* Paper Space Layout Tabs */}
      {layouts.map((l) => {
        const isActive = activeSpace === l.id;
        const isEditing = editingLayoutId === l.id;

        return (
          <div
            key={l.id}
            className={`relative flex items-center h-full border-r border-[#2c313a] group ${
              isActive ? 'bg-[#21252b] text-white border-b-2 border-b-[#007acc]' : 'text-[#6c7280] hover:bg-[#21252b]/50'
            }`}
          >
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') setEditingLayoutId(null);
                }}
                autoFocus
                className="bg-[#1b1e23] text-white px-2 py-0.5 text-[11px] outline-none border border-[#007acc] w-28"
              />
            ) : (
              <button
                onClick={() => handleSelectSpace(l.id)}
                className="h-full px-2.5 flex items-center gap-1.5 hover:text-white"
                title={`${l.name} (${l.paperSize} ${l.orientation})`}
              >
                <span>{l.name}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-[#1b1e23] text-[#6c7280]">
                  {l.paperSize}
                </span>
              </button>
            )}

            {/* Layout Options Dropdown Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuLayoutId(menuLayoutId === l.id ? null : l.id);
              }}
              className="p-1 text-[#6c7280] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Opções do Layout"
            >
              <MoreVertical size={12} />
            </button>

            {/* Dropdown Menu */}
            {menuLayoutId === l.id && (
              <div className="absolute bottom-8 left-0 w-44 bg-[#1e2227] border border-[#2c313a] shadow-2xl rounded py-1 z-50 text-xs">
                <button
                  onClick={(e) => handleStartRename(l, e)}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#282c34] text-[#abb2bf]"
                >
                  <Edit3 size={12} /> Renomear
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    core.setActiveSpace(l.id);
                    setMenuLayoutId(null);
                    onOpenPlotModal();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[#282c34] text-[#abb2bf]"
                >
                  <Printer size={12} /> Configurar / Plotar
                </button>
                {layouts.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteLayout(l.id, e)}
                    className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-red-900/30 text-red-400"
                  >
                    <Trash2 size={12} /> Excluir Layout
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Layout Button */}
      <button
        onClick={handleCreateNewLayout}
        className="h-full px-2 text-[#6c7280] hover:text-white hover:bg-[#21252b] flex items-center justify-center transition-colors border-r border-[#2c313a]"
        title="Criar novo Layout de Prancha"
      >
        <Plus size={13} />
      </button>

      {/* Quick Plot Button */}
      <button
        onClick={onOpenPlotModal}
        className="h-full px-2.5 text-[#abb2bf] hover:text-white hover:bg-[#007acc]/20 flex items-center gap-1 transition-colors border-r border-[#2c313a]"
        title="Plotar / Exportar Prancha para PDF (Ctrl+P)"
      >
        <Printer size={12} className="text-[#00e5ff]" />
        <span className="hidden sm:inline">PLOT</span>
      </button>
    </div>
  );
};
