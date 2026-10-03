import React, { useState, useEffect } from 'react';
import { CADCore } from '../core/CADCore';
import { CADUserPresence } from '../core/types';
import {
  X,
  Users,
  Radio,
  Send,
  MessageSquare,
  Copy,
  Check,
  Circle,
  MousePointer2,
} from 'lucide-react';

interface CollaborationModalProps {
  core: CADCore;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  user: string;
  text: string;
  color: string;
  time: string;
}

export const CollaborationModal: React.FC<CollaborationModalProps> = ({ core, isOpen, onClose }) => {
  const collab = core.getCollaborationManager();
  const [roomId, setRoomId] = useState<string>(collab.getRoomId() || 'projeto-alpha');
  const [userName, setUserName] = useState<string>(collab.getLocalUser().name);
  const [isConnected, setIsConnected] = useState<boolean>(collab.isConnected());
  const [collaborators, setCollaborators] = useState<CADUserPresence[]>(collab.getCollaborators());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setIsConnected(collab.isConnected());
      setCollaborators(collab.getCollaborators());
    }, 1000);

    const unsubMsg = core.on('collab:message', (data: any) => {
      setChatMessages((prev) => [
        ...prev,
        {
          user: data.user,
          text: data.text,
          color: data.color,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    return () => {
      clearInterval(interval);
      unsubMsg();
    };
  }, [isOpen, core, collab]);

  if (!isOpen) return null;

  const handleConnectToggle = () => {
    if (isConnected) {
      core.leaveCollaborationRoom();
      setIsConnected(false);
      setCollaborators([]);
    } else {
      core.joinCollaborationRoom(roomId.trim() || 'projeto-padrao', userName.trim());
      setIsConnected(true);
      setCollaborators(collab.getCollaborators());
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !isConnected) return;
    collab.sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#21252b] border border-[#3e4451] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#abb2bf] max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#282c34] border-b border-[#3e4451]">
          <div className="flex items-center gap-2 text-white font-medium">
            <Users className="w-5 h-5 text-[#98c379]" />
            <span>Colaboração em Tempo Real (Multiplayer CAD)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#3e4451] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connection Bar */}
        <div className="px-5 py-3 bg-[#1e2227] border-b border-[#2c313a] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-1 min-w-[260px]">
            <div className="flex-1">
              <label className="block text-[11px] text-gray-400 mb-1">ID da Sessão / Sala</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={roomId}
                  disabled={isConnected}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Ex: projeto-matriz"
                  className="w-full bg-[#282c34] border border-[#3e4451] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#98c379] disabled:opacity-60"
                />
                <button
                  onClick={handleCopyLink}
                  title="Copiar ID da sala"
                  className="p-1.5 bg-[#282c34] hover:bg-[#353b45] text-gray-300 rounded border border-[#3e4451]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#98c379]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="w-36">
              <label className="block text-[11px] text-gray-400 mb-1">Seu Nome</label>
              <input
                type="text"
                value={userName}
                disabled={isConnected}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-[#282c34] border border-[#3e4451] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#98c379] disabled:opacity-60"
              />
            </div>
          </div>

          <button
            onClick={handleConnectToggle}
            className={`px-4 py-2 font-semibold rounded flex items-center gap-1.5 shadow transition-colors mt-4 sm:mt-0 ${
              isConnected
                ? 'bg-[#e06c75] hover:bg-[#c9535c] text-white'
                : 'bg-[#98c379] hover:bg-[#85b565] text-black'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isConnected ? 'Desconectar' : 'Conectar à Sala'}</span>
          </button>
        </div>

        {/* Content Body: Collaborators & Chat */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#2c313a] overflow-hidden">
          {/* Active Collaborators Panel */}
          <div className="p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-white">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#61afef]" />
                Usuários Conectados ({collaborators.length + (isConnected ? 1 : 0)})
              </span>
              {isConnected && (
                <span className="text-[10px] text-[#98c379] flex items-center gap-1">
                  <Circle className="w-2 h-2 fill-[#98c379]" /> Online
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {/* Local User */}
              {isConnected && (
                <div className="p-2.5 bg-[#1e2227] border border-[#3e4451] rounded flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: collab.getLocalUser().color }}
                    />
                    <span className="text-white font-medium">{collab.getLocalUser().name} (Você)</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">Anfitrião</span>
                </div>
              )}

              {/* Remote Collaborators */}
              {collaborators.map((user) => (
                <div
                  key={user.id}
                  className="p-2.5 bg-[#181a1f] border border-[#2c313a] rounded flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: user.color }}
                    />
                    <div>
                      <div className="text-white font-medium">{user.name}</div>
                      {user.cursor && (
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                          <MousePointer2 className="w-2.5 h-2.5 text-[#61afef]" />
                          ({user.cursor.x.toFixed(0)}, {user.cursor.y.toFixed(0)})
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 capitalize">{user.activeTool || 'select'}</span>
                </div>
              ))}

              {!isConnected && (
                <div className="text-center py-8 text-xs text-gray-500 italic">
                  Conecte-se para sincronizar desenhos e cursores com outros membros da equipe.
                </div>
              )}
            </div>
          </div>

          {/* Live Session Chat */}
          <div className="p-4 flex flex-col overflow-hidden bg-[#181a1f]/40">
            <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-white">
              <MessageSquare className="w-4 h-4 text-[#e5c07b]" />
              <span>Chat da Sessão</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-[#181a1f] border border-[#3e4451] rounded-lg text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-center py-8 text-gray-500 italic text-[11px]">
                  Nenhuma mensagem na sala ainda.
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="font-semibold" style={{ color: msg.color }}>
                        {msg.user}
                      </span>
                      <span className="text-gray-500">{msg.time}</span>
                    </div>
                    <div className="text-[#abb2bf] pl-1 text-[11px] leading-relaxed">{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                disabled={!isConnected}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isConnected ? 'Enviar mensagem para a equipe...' : 'Conecte-se para conversar'}
                className="flex-1 bg-[#1e2227] border border-[#3e4451] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e5c07b] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isConnected || !chatInput.trim()}
                className="p-1.5 bg-[#e5c07b] hover:bg-[#d4ad68] disabled:opacity-40 text-black rounded transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#282c34] border-t border-[#3e4451] text-xs">
          <div className="text-gray-400 text-[11px]">
            Sincronização P2P sem travamento de tela (CRDT Broadcast).
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
