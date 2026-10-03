import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { DataExtractionManager, DataExtractionResult } from '../core/DataExtractionManager';
import { Table, Download, RefreshCw, X, Box, Ruler, Square, FileText } from 'lucide-react';

interface DataExtractionModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const DataExtractionModal: React.FC<DataExtractionModalProps> = ({ core, isOpen, onClose }) => {
  const [data, setData] = useState<DataExtractionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'blocks' | 'linear' | 'areas'>('blocks');

  const refreshData = () => {
    const res = DataExtractionManager.extractData(core.getEntities(), core.getLayers());
    setData(res);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen, core]);

  if (!isOpen || !data) return null;

  const handleExportCSV = () => {
    const csv = DataExtractionManager.generateCSV(data);
    DataExtractionManager.downloadFile(csv, `CloneCAD_BOM_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    core.logCommandMessage('Data extraction exported to CSV file.');
  };

  const handleExportJSON = () => {
    const json = DataExtractionManager.generateJSON(data);
    DataExtractionManager.downloadFile(json, `CloneCAD_BOM_${Date.now()}.json`, 'application/json');
    core.logCommandMessage('Data extraction exported to JSON file.');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#21252b] border border-[#3a3f4b] rounded-lg shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden text-[#abb2bf] font-sans text-xs max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#181a1f] px-4 py-2.5 border-b border-[#2c313a] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#e5e9f0] font-semibold text-sm">
            <Table size={18} className="text-[#61afef]" />
            <span>Data Extraction & Quantitativos (DATAEXTRACTION / BCOUNT)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              title="Refresh Data"
              className="p-1 rounded hover:bg-[#282c34] text-[#abb2bf] hover:text-white"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="text-[#5c6370] hover:text-white p-1 rounded hover:bg-[#282c34]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-[#1b1e23] border-b border-[#2c313a]">
          <div className="bg-[#21252b] border border-[#3a3f4b] p-3 rounded flex items-center gap-3">
            <div className="p-2 rounded bg-[#61afef]/10 text-[#61afef]">
              <FileText size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5c6370] block">Total Entities</span>
              <span className="text-lg font-bold text-white font-mono">{data.summary.totalEntities}</span>
            </div>
          </div>

          <div className="bg-[#21252b] border border-[#3a3f4b] p-3 rounded flex items-center gap-3">
            <div className="p-2 rounded bg-[#98c379]/10 text-[#98c379]">
              <Box size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5c6370] block">Block References</span>
              <span className="text-lg font-bold text-white font-mono">{data.summary.totalBlocks}</span>
            </div>
          </div>

          <div className="bg-[#21252b] border border-[#3a3f4b] p-3 rounded flex items-center gap-3">
            <div className="p-2 rounded bg-[#e5c07b]/10 text-[#e5c07b]">
              <Ruler size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5c6370] block">Total Length</span>
              <span className="text-lg font-bold text-white font-mono">
                {data.summary.totalLinearLength.toFixed(1)} <span className="text-xs font-normal text-[#5c6370]">u</span>
              </span>
            </div>
          </div>

          <div className="bg-[#21252b] border border-[#3a3f4b] p-3 rounded flex items-center gap-3">
            <div className="p-2 rounded bg-[#c678dd]/10 text-[#c678dd]">
              <Square size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5c6370] block">Total Enclosed Area</span>
              <span className="text-lg font-bold text-white font-mono">
                {data.summary.totalArea.toFixed(1)} <span className="text-xs font-normal text-[#5c6370]">u²</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#2c313a] bg-[#1e2227] px-4 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors ${
              activeTab === 'blocks'
                ? 'bg-[#21252b] text-[#61afef] border-t-2 border-[#61afef]'
                : 'text-[#5c6370] hover:text-[#abb2bf]'
            }`}
          >
            Blocks & Components Inventory ({data.blockCounts.length})
          </button>
          <button
            onClick={() => setActiveTab('linear')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors ${
              activeTab === 'linear'
                ? 'bg-[#21252b] text-[#61afef] border-t-2 border-[#61afef]'
                : 'text-[#5c6370] hover:text-[#abb2bf]'
            }`}
          >
            Linear Metrage by Layer ({data.linearByLayer.length})
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors ${
              activeTab === 'areas'
                ? 'bg-[#21252b] text-[#61afef] border-t-2 border-[#61afef]'
                : 'text-[#5c6370] hover:text-[#abb2bf]'
            }`}
          >
            Areas & Surfaces ({data.areasList.length})
          </button>
        </div>

        {/* Tab Content Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'blocks' && (
            <div className="border border-[#3a3f4b] rounded overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#181a1f] text-[#5c6370] uppercase font-semibold border-b border-[#3a3f4b]">
                  <tr>
                    <th className="px-3 py-2">Block Name</th>
                    <th className="px-3 py-2">Layer</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2">Attributes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c313a]">
                  {data.blockCounts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[#5c6370] italic">
                        No block references found in drawing.
                      </td>
                    </tr>
                  ) : (
                    data.blockCounts.map((b, idx) => (
                      <tr key={idx} className="hover:bg-[#282c34] transition-colors">
                        <td className="px-3 py-2 text-white font-semibold">{b.blockName}</td>
                        <td className="px-3 py-2 text-[#61afef]">{b.layer}</td>
                        <td className="px-3 py-2 text-right text-[#98c379] font-bold">{b.count}</td>
                        <td className="px-3 py-2 text-[#abb2bf] truncate max-w-xs">
                          {Object.entries(b.attributes).length > 0
                            ? Object.entries(b.attributes)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' | ')
                            : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'linear' && (
            <div className="border border-[#3a3f4b] rounded overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#181a1f] text-[#5c6370] uppercase font-semibold border-b border-[#3a3f4b]">
                  <tr>
                    <th className="px-3 py-2">Layer Name</th>
                    <th className="px-3 py-2">Entity Type</th>
                    <th className="px-3 py-2 text-right">Count</th>
                    <th className="px-3 py-2 text-right">Total Length (Units)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c313a]">
                  {data.linearByLayer.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[#5c6370] italic">
                        No linear entities found in drawing.
                      </td>
                    </tr>
                  ) : (
                    data.linearByLayer.map((l, idx) => (
                      <tr key={idx} className="hover:bg-[#282c34] transition-colors">
                        <td className="px-3 py-2 text-[#61afef] font-semibold">{l.layerName}</td>
                        <td className="px-3 py-2 text-[#abb2bf]">{l.entityType}</td>
                        <td className="px-3 py-2 text-right">{l.count}</td>
                        <td className="px-3 py-2 text-right text-[#e5c07b] font-bold font-mono">
                          {l.totalLength.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'areas' && (
            <div className="border border-[#3a3f4b] rounded overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#181a1f] text-[#5c6370] uppercase font-semibold border-b border-[#3a3f4b]">
                  <tr>
                    <th className="px-3 py-2">Entity ID</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Layer</th>
                    <th className="px-3 py-2 text-right">Area (sq units)</th>
                    <th className="px-3 py-2 text-right">Perimeter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2c313a]">
                  {data.areasList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-[#5c6370] italic">
                        No closed surface entities found in drawing.
                      </td>
                    </tr>
                  ) : (
                    data.areasList.map((a, idx) => (
                      <tr key={idx} className="hover:bg-[#282c34] transition-colors">
                        <td className="px-3 py-2 text-[#5c6370]">{a.entityId.slice(0, 14)}...</td>
                        <td className="px-3 py-2 text-white">{a.entityType}</td>
                        <td className="px-3 py-2 text-[#61afef]">{a.layerName}</td>
                        <td className="px-3 py-2 text-right text-[#c678dd] font-bold">
                          {a.area.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-[#abb2bf]">
                          {a.perimeter > 0 ? a.perimeter.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-[#181a1f] px-4 py-2.5 border-t border-[#2c313a] flex items-center justify-between">
          <span className="text-[11px] text-[#5c6370]">
            Export quantities directly to CSV or JSON formats.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#282c34] hover:bg-[#353b45] text-[#e5e9f0] rounded border border-[#3a3f4b]"
            >
              <Download size={13} className="text-[#98c379]" />
              <span>Export CSV (Excel)</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#282c34] hover:bg-[#353b45] text-[#e5e9f0] rounded border border-[#3a3f4b]"
            >
              <Download size={13} className="text-[#61afef]" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white font-medium rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
