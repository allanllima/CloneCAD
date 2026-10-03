import React, { useState } from 'react';
import { CADCore } from '../core/CADCore';
import { CADCommit, CADDiffResult } from '../core/types';
import {
  X,
  GitCommit,
  GitBranch,
  History,
  RotateCcw,
  GitCompare,
  Plus,
  CheckCircle2,
  Trash2,
  Layers,
  Sparkles,
  Calendar,
  User,
} from 'lucide-react';

interface VersionControlModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const VersionControlModal: React.FC<VersionControlModalProps> = ({ core, isOpen, onClose }) => {
  const vcs = core.getVersionControlManager();
  const [commits, setCommits] = useState<CADCommit[]>(vcs.getCommits());
  const [branches, setBranches] = useState<string[]>(vcs.getBranches());
  const [currentBranch, setCurrentBranch] = useState<string>(vcs.getCurrentBranch());
  const [selectedCommitId, setSelectedCommitId] = useState<string>(commits[0]?.id || '');
  const [diffResult, setDiffResult] = useState<CADDiffResult | null>(null);

  // New commit input
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('Arquiteto');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [showNewBranchInput, setShowNewBranchInput] = useState<boolean>(false);

  if (!isOpen) return null;

  const refreshData = () => {
    setCommits(vcs.getCommits());
    setBranches(vcs.getBranches());
    setCurrentBranch(vcs.getCurrentBranch());
  };

  const handleCreateCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    const c = core.commitDrawing(commitMessage.trim(), authorName.trim() || 'Arquiteto');
    setCommitMessage('');
    refreshData();
    setSelectedCommitId(c.id);
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    if (core.createBranch(newBranchName.trim())) {
      core.checkoutBranch(newBranchName.trim());
      setNewBranchName('');
      setShowNewBranchInput(false);
      refreshData();
    }
  };

  const handleSelectBranch = (bName: string) => {
    core.checkoutBranch(bName);
    refreshData();
  };

  const handleCheckoutCommit = (commitId: string) => {
    if (confirm('Deseja restaurar o desenho para esta revisão? O estado atual da cena será substituído.')) {
      core.checkoutCommit(commitId);
      onClose();
    }
  };

  const handleDiffWithCurrent = (commitId: string) => {
    const diff = core.diffCurrentWithCommit(commitId);
    setDiffResult(diff);
  };

  const selectedCommit = commits.find((c) => c.id === selectedCommitId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-[#21252b] border border-[#3e4451] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#abb2bf] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#282c34] border-b border-[#3e4451]">
          <div className="flex items-center gap-2 text-white font-medium">
            <GitCommit className="w-5 h-5 text-[#c678dd]" />
            <span>Controle de Versão do Desenho (Git CAD & Visual Diff)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#3e4451] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Branch Bar & Commit Form */}
        <div className="px-5 py-3 bg-[#1e2227] border-b border-[#2c313a] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Branch dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 flex items-center gap-1 font-medium">
              <GitBranch className="w-3.5 h-3.5 text-[#61afef]" /> Branch:
            </span>
            <select
              value={currentBranch}
              onChange={(e) => handleSelectBranch(e.target.value)}
              className="bg-[#282c34] border border-[#3e4451] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#c678dd]"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {!showNewBranchInput ? (
              <button
                onClick={() => setShowNewBranchInput(true)}
                className="px-2 py-1 bg-[#282c34] hover:bg-[#353b45] text-gray-300 rounded border border-[#3e4451] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Novo Branch
              </button>
            ) : (
              <form onSubmit={handleCreateBranch} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Nome do branch..."
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="bg-[#282c34] border border-[#3e4451] rounded px-2 py-0.5 text-white w-32 outline-none focus:border-[#61afef]"
                />
                <button type="submit" className="px-2 py-0.5 bg-[#61afef] text-white rounded">
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewBranchInput(false)}
                  className="px-1.5 py-0.5 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            )}
          </div>

          {/* Quick Commit Form */}
          <form onSubmit={handleCreateCommit} className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <input
              type="text"
              placeholder="Mensagem do commit (ex: 'Adicionou layout de banheiros')..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="flex-1 bg-[#282c34] border border-[#3e4451] rounded px-3 py-1 text-white outline-none focus:border-[#c678dd]"
            />
            <button
              type="submit"
              disabled={!commitMessage.trim()}
              className="px-3.5 py-1 bg-[#c678dd] hover:bg-[#b05dc7] disabled:opacity-40 text-white font-medium rounded flex items-center gap-1 shadow transition-colors"
            >
              <GitCommit className="w-3.5 h-3.5" /> Salvar Revisão
            </button>
          </form>
        </div>

        {/* Body: Left Commits List / Right Detail & Diff */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#2c313a] overflow-hidden">
          {/* Commit History Timeline */}
          <div className="p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-white">
              <span className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#e5c07b]" />
                Histórico de Revisões ({commits.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {commits.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-500 italic">
                  Nenhum commit criado ainda. Digite uma mensagem acima para criar a primeira revisão do desenho.
                </div>
              ) : (
                commits.map((c) => {
                  const isSelected = c.id === selectedCommitId;
                  const dateStr = new Date(c.timestamp).toLocaleString();
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCommitId(c.id);
                        setDiffResult(null);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#2c313a] border-[#c678dd]'
                          : 'bg-[#181a1f] border-[#2c313a] hover:border-[#3e4451]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{c.message}</span>
                        <span className="font-mono text-[11px] text-[#c678dd] bg-[#c678dd]/10 px-1.5 py-0.5 rounded">
                          {c.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {c.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {dateStr}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {c.entities.length} objetos
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Commit Inspector & Visual Diff */}
          <div className="p-4 flex flex-col overflow-hidden bg-[#181a1f]/30">
            {selectedCommit ? (
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                <div className="p-3 bg-[#1e2227] border border-[#3e4451] rounded-lg">
                  <div className="text-xs font-semibold text-white mb-1">{selectedCommit.message}</div>
                  <div className="text-[11px] text-gray-400 space-y-1">
                    <div>Hash: <span className="font-mono text-white">{selectedCommit.id}</span></div>
                    <div>Data: {new Date(selectedCommit.timestamp).toLocaleString()}</div>
                    <div>Autor: {selectedCommit.author}</div>
                    <div>Entidades gravadas: {selectedCommit.entities.length}</div>
                    <div>Camadas gravadas: {selectedCommit.layers.length}</div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#2c313a]">
                    <button
                      onClick={() => handleCheckoutCommit(selectedCommit.id)}
                      className="px-3 py-1 bg-[#61afef] hover:bg-[#4d97d5] text-white text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar Este Estado
                    </button>
                    <button
                      onClick={() => handleDiffWithCurrent(selectedCommit.id)}
                      className="px-3 py-1 bg-[#282c34] hover:bg-[#353b45] text-gray-200 border border-[#3e4451] text-xs rounded flex items-center gap-1 transition-colors"
                    >
                      <GitCompare className="w-3 h-3 text-[#e5c07b]" /> Comparar com Atual (Diff)
                    </button>
                  </div>
                </div>

                {/* Diff Result Box */}
                {diffResult && (
                  <div className="flex-1 flex flex-col overflow-hidden p-3 bg-[#1e2227] border border-[#3e4451] rounded-lg">
                    <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                      <GitCompare className="w-3.5 h-3.5 text-[#e5c07b]" />
                      Resultado do Visual Diff
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
                      <div className="p-2 bg-[#98c379]/10 border border-[#98c379]/30 rounded">
                        <div className="text-[#98c379] font-bold text-sm">{diffResult.summary.addedCount}</div>
                        <div className="text-[10px] text-gray-400">Adicionados</div>
                      </div>
                      <div className="p-2 bg-[#e06c75]/10 border border-[#e06c75]/30 rounded">
                        <div className="text-[#e06c75] font-bold text-sm">{diffResult.summary.deletedCount}</div>
                        <div className="text-[10px] text-gray-400">Removidos</div>
                      </div>
                      <div className="p-2 bg-[#e5c07b]/10 border border-[#e5c07b]/30 rounded">
                        <div className="text-[#e5c07b] font-bold text-sm">{diffResult.summary.modifiedCount}</div>
                        <div className="text-[10px] text-gray-400">Modificados</div>
                      </div>
                      <div className="p-2 bg-[#3e4451]/30 border border-[#3e4451] rounded">
                        <div className="text-gray-300 font-bold text-sm">{diffResult.summary.unchangedCount}</div>
                        <div className="text-[10px] text-gray-400">Inalterados</div>
                      </div>
                    </div>

                    {/* Diff Details Log */}
                    <div className="flex-1 overflow-y-auto space-y-1 text-[11px] font-mono pr-1">
                      {diffResult.added.map((ent) => (
                        <div key={ent.id} className="text-[#98c379] flex items-center gap-1">
                          + [NOVO] {ent.type.toUpperCase()} ({ent.id})
                        </div>
                      ))}
                      {diffResult.deleted.map((ent) => (
                        <div key={ent.id} className="text-[#e06c75] flex items-center gap-1">
                          - [APAGADO] {ent.type.toUpperCase()} ({ent.id})
                        </div>
                      ))}
                      {diffResult.modified.map((m) => (
                        <div key={m.after.id} className="text-[#e5c07b] space-y-0.5">
                          <div>~ [MODIFICADO] {m.after.type.toUpperCase()} ({m.after.id})</div>
                          {m.changes.map((c, i) => (
                            <div key={i} className="pl-4 text-gray-400 text-[10px]">↳ {c}</div>
                          ))}
                        </div>
                      ))}
                      {diffResult.summary.addedCount === 0 &&
                        diffResult.summary.deletedCount === 0 &&
                        diffResult.summary.modifiedCount === 0 && (
                          <div className="text-gray-400 italic text-center py-4">
                            Nenhuma alteração detectada entre o commit e o desenho atual.
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-gray-500 italic">
                Selecione uma revisão à esquerda para inspecionar os detalhes ou calcular o Diff.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#282c34] border-t border-[#3e4451] text-xs">
          <div className="text-gray-400 text-[11px]">
            Git para CAD: ramificações, snapshots sem perdas e inspeção de mudanças.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-[#3e4451]/50 hover:bg-[#3e4451] rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
