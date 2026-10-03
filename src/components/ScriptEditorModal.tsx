import React, { useState } from 'react';
import { CADCore } from '../core/CADCore';
import { CADScript, ScriptExecutionResult } from '../core/types';
import {
  X,
  Play,
  Terminal,
  Code2,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
} from 'lucide-react';

interface ScriptEditorModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

export const ScriptEditorModal: React.FC<ScriptEditorModalProps> = ({ core, isOpen, onClose }) => {
  const templates = core.getScriptTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [language, setLanguage] = useState<'javascript' | 'lisp'>(templates[0]?.language || 'javascript');
  const [code, setCode] = useState<string>(templates[0]?.code || '');
  const [result, setResult] = useState<ScriptExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setLanguage(tmpl.language);
      setCode(tmpl.code);
    }
  };

  const handleRun = () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = core.executeScript(code, language);
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || String(err),
        output: [err.message || String(err)],
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#21252b] border border-[#3e4451] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#abb2bf] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#282c34] border-b border-[#3e4451]">
          <div className="flex items-center gap-2 text-white font-medium">
            <Terminal className="w-5 h-5 text-[#61afef]" />
            <span>Console & Editor de Scripts CAD (JS / AutoLISP)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#3e4451] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 bg-[#1e2227] border-b border-[#2c313a] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Linguagem:</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="bg-[#282c34] border border-[#3e4451] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#61afef]"
              >
                <option value="javascript">JavaScript / TypeScript API</option>
                <option value="lisp">AutoLISP Clássico</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Templates:</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="bg-[#282c34] border border-[#3e4451] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#61afef]"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            className="px-4 py-1.5 bg-[#98c379] hover:bg-[#85b565] disabled:opacity-40 text-black font-semibold rounded flex items-center gap-1.5 shadow transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>Executar Script</span>
          </button>
        </div>

        {/* Editor & Output Body */}
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          {/* Code Textarea */}
          <div className="flex-1 min-h-[220px] flex flex-col bg-[#181a1f] border border-[#3e4451] rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-[#21252b] border-b border-[#2c313a] text-[11px] text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono">
                <Code2 className="w-3.5 h-3.5 text-[#61afef]" />
                {language === 'javascript' ? 'script.js' : 'routine.lsp'}
              </span>
              <span className="text-[10px] text-gray-500">
                {language === 'javascript'
                  ? 'Objetos disponíveis: core, cad, console, Math'
                  : 'Funções suportadas: defun, command, setq, list, distance, etc.'}
              </span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 w-full p-3 bg-transparent text-[#abb2bf] font-mono text-xs outline-none resize-none leading-relaxed selection:bg-[#3e4451]"
              placeholder="Digite seu código ou rotina LISP aqui..."
              spellCheck={false}
            />
          </div>

          {/* Console Output */}
          <div className="h-44 bg-[#181a1f] border border-[#3e4451] rounded-lg flex flex-col overflow-hidden font-mono text-xs">
            <div className="px-3 py-1.5 bg-[#21252b] border-b border-[#2c313a] flex items-center justify-between text-[11px]">
              <span className="text-gray-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#e5c07b]" />
                Console Output
              </span>
              {result && (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-gray-400 text-[10px]">
                    <Clock className="w-3 h-3" /> {result.executionTimeMs} ms
                  </span>
                  {result.success ? (
                    <span className="text-[#98c379] flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sucesso
                    </span>
                  ) : (
                    <span className="text-[#e06c75] flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> Erro
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-1">
              {!result && <div className="text-gray-500 italic">Pressione "Executar Script" para rodar o código.</div>}
              {result?.output.map((line, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    line.includes('[ERROR]')
                      ? 'text-[#e06c75]'
                      : line.includes('[WARN]')
                      ? 'text-[#e5c07b]'
                      : line.includes('[ALERT]')
                      ? 'text-[#61afef]'
                      : 'text-[#abb2bf]'
                  }`}
                >
                  {line}
                </div>
              ))}
              {result?.error && !result.output.some((o) => o.includes(result.error!)) && (
                <div className="text-[#e06c75]">{result.error}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#282c34] border-t border-[#3e4451] text-xs">
          <div className="text-gray-400 text-[11px]">
            Execute rotinas repetitivas, cálculos de geometria ou automação em lote.
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
