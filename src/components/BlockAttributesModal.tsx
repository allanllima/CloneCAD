import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { BlockReferenceEntity, CADBlockDefinition } from '../core/types';
import { ModifyEntityCommand } from '../commands/ModifyEntityCommand';
import { X, Tag, Check } from 'lucide-react';

interface BlockAttributesModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
  entity: BlockReferenceEntity | null;
}

export const BlockAttributesModal: React.FC<BlockAttributesModalProps> = ({
  core,
  isOpen,
  onClose,
  entity,
}) => {
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [definition, setDefinition] = useState<CADBlockDefinition | null>(null);

  useEffect(() => {
    if (isOpen && entity) {
      setAttributes({ ...(entity.attributeValues || {}) });
      const def = core.getBlockDefinition(entity.blockName);
      setDefinition(def || null);
    }
  }, [isOpen, entity, core]);

  if (!isOpen || !entity) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...entity,
      attributeValues: { ...attributes },
    };
    core.executeCommand(new ModifyEntityCommand(core, entity, updated, 'EDIT BLOCK ATTRIBUTES'));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="w-[420px] max-w-[95vw] bg-[#21252b] border border-[#3e4451] rounded shadow-2xl flex flex-col font-sans text-xs text-[#abb2bf] overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-[#181a1f] border-b border-[#2c313a] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Tag size={16} className="text-[#98c379]" />
            <span>Edit Block Attributes — {entity.blockName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#abb2bf] hover:text-white rounded hover:bg-[#282c34]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <p className="text-[11px] text-[#5c6370]">
            Update variable attribute values attached to this block instance:
          </p>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {definition && definition.attributes && definition.attributes.length > 0 ? (
              definition.attributes.map((attr) => (
                <div key={attr.tag} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-[#e5e9f0]">{attr.prompt || attr.tag}:</span>
                    <span className="font-mono text-[10px] text-[#5c6370]">[{attr.tag}]</span>
                  </div>
                  <input
                    type="text"
                    value={attributes[attr.tag] ?? attr.defaultValue}
                    onChange={(e) =>
                      setAttributes({ ...attributes, [attr.tag]: e.target.value })
                    }
                    className="w-full bg-[#181a1f] border border-[#3e4451] rounded px-3 py-1.5 text-white font-mono text-xs outline-none focus:border-[#007acc]"
                  />
                </div>
              ))
            ) : Object.keys(attributes).length > 0 ? (
              Object.entries(attributes).map(([tag, val]) => (
                <div key={tag} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-[#e5e9f0]">{tag}:</span>
                  </div>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setAttributes({ ...attributes, [tag]: e.target.value })}
                    className="w-full bg-[#181a1f] border border-[#3e4451] rounded px-3 py-1.5 text-white font-mono text-xs outline-none focus:border-[#007acc]"
                  />
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-[#5c6370]">No attributes defined for this block.</p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-[#2c313a] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded hover:bg-[#282c34] text-[#abb2bf]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0098ff] text-white rounded font-semibold transition-colors flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Apply Attributes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
