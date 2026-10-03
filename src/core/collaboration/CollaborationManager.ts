import {
  CADCoreAPI,
  CADEntity,
  CADUserPresence,
  CADCollaborationMessage,
  Point2D,
} from '../types';

const VIBRANT_CAD_COLORS = [
  '#61afef', // Blue
  '#98c379', // Green
  '#e5c07b', // Yellow
  '#e06c75', // Red
  '#c678dd', // Magenta
  '#56b6c2', // Cyan
  '#d19a66', // Orange
];

export class CollaborationManager {
  private roomId: string | null = null;
  private localUser: CADUserPresence;
  private collaborators: Map<string, CADUserPresence> = new Map();
  private channel: BroadcastChannel | null = null;
  private heartbeatTimer: any = null;
  private isProcessingRemote = false;

  constructor(private core: CADCoreAPI) {
    const randomColor = VIBRANT_CAD_COLORS[Math.floor(Math.random() * VIBRANT_CAD_COLORS.length)];
    const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    this.localUser = {
      id: userId,
      name: `Arquiteto_${userId.slice(-4)}`,
      color: randomColor,
      lastActive: Date.now(),
    };
  }

  public getLocalUser(): CADUserPresence {
    return { ...this.localUser };
  }

  public setLocalUserName(name: string): void {
    this.localUser.name = name;
    this.broadcastPresence();
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public isConnected(): boolean {
    return this.roomId !== null;
  }

  public getCollaborators(): CADUserPresence[] {
    // Purge expired collaborators (inactive > 15s)
    const now = Date.now();
    for (const [id, user] of this.collaborators.entries()) {
      if (now - user.lastActive > 15000) {
        this.collaborators.delete(id);
        this.core.emit('collab:user_left', user);
      }
    }
    return Array.from(this.collaborators.values());
  }

  public joinRoom(roomId: string, userName?: string): void {
    if (this.roomId === roomId && this.channel) return;
    this.leaveRoom();

    this.roomId = roomId;
    if (userName) this.localUser.name = userName;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(`clonecad_room_${roomId}`);
      this.channel.onmessage = (event: MessageEvent<CADCollaborationMessage>) => {
        this.handleRemoteMessage(event.data);
      };
    }

    // Start heartbeat
    this.broadcastPresence();
    this.heartbeatTimer = setInterval(() => {
      this.broadcastPresence();
    }, 3000);

    this.core.logCommandMessage(`Conectado à sessão colaborativa: "${roomId}" como ${this.localUser.name}`);
    this.core.emit('collab:open_modal');
  }

  public leaveRoom(): void {
    if (!this.roomId) return;

    if (this.channel) {
      this.broadcast({
        type: 'presence',
        userId: this.localUser.id,
        userName: this.localUser.name,
        userColor: this.localUser.color,
        payload: { status: 'leave' },
        timestamp: Date.now(),
      });
      this.channel.close();
      this.channel = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const prevRoom = this.roomId;
    this.roomId = null;
    this.collaborators.clear();
    this.core.logCommandMessage(`Desconectado da sessão colaborativa "${prevRoom}".`);
  }

  public broadcastCursor(cursor: Point2D, activeTool?: string): void {
    if (!this.isConnected()) return;
    this.localUser.cursor = cursor;
    this.localUser.activeTool = activeTool;
    this.broadcast({
      type: 'cursor:move',
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      payload: { cursor, activeTool },
      timestamp: Date.now(),
    });
  }

  public broadcastEntityCreate(entity: CADEntity): void {
    if (!this.isConnected() || this.isProcessingRemote) return;
    this.broadcast({
      type: 'entity:create',
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      payload: entity,
      timestamp: Date.now(),
    });
  }

  public broadcastEntityUpdate(entity: CADEntity): void {
    if (!this.isConnected() || this.isProcessingRemote) return;
    this.broadcast({
      type: 'entity:update',
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      payload: entity,
      timestamp: Date.now(),
    });
  }

  public broadcastEntityDelete(entityId: string): void {
    if (!this.isConnected() || this.isProcessingRemote) return;
    this.broadcast({
      type: 'entity:delete',
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      payload: { id: entityId },
      timestamp: Date.now(),
    });
  }

  public sendChatMessage(message: string): void {
    if (!this.isConnected()) return;
    this.broadcast({
      type: 'chat',
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      payload: { text: message },
      timestamp: Date.now(),
    });
    this.core.emit('collab:message', {
      user: this.localUser.name,
      text: message,
      color: this.localUser.color,
    });
  }

  private broadcastPresence(): void {
    if (!this.isConnected()) return;
    this.broadcast({
      type: 'presence',
      userId: this.localUser.id,
      userName: this.localUser.name,
      userColor: this.localUser.color,
      payload: {
        status: 'active',
        cursor: this.localUser.cursor,
        activeTool: this.localUser.activeTool,
      },
      timestamp: Date.now(),
    });
  }

  private broadcast(msg: CADCollaborationMessage): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage(msg);
    } catch (e) {
      console.warn('Collab broadcast error:', e);
    }
  }

  private handleRemoteMessage(msg: CADCollaborationMessage): void {
    if (msg.userId === this.localUser.id) return; // ignore echo

    switch (msg.type) {
      case 'presence': {
        if (msg.payload?.status === 'leave') {
          const removed = this.collaborators.get(msg.userId);
          this.collaborators.delete(msg.userId);
          if (removed) this.core.emit('collab:user_left', removed);
        } else {
          const isNew = !this.collaborators.has(msg.userId);
          const user: CADUserPresence = {
            id: msg.userId,
            name: msg.userName,
            color: msg.userColor,
            cursor: msg.payload?.cursor,
            activeTool: msg.payload?.activeTool,
            lastActive: Date.now(),
          };
          this.collaborators.set(msg.userId, user);
          if (isNew) {
            this.core.emit('collab:user_joined', user);
            this.core.logCommandMessage(`Usuário conectado: ${user.name}`);
            // Answer back with our presence
            this.broadcastPresence();
          }
        }
        break;
      }

      case 'cursor:move': {
        const user = this.collaborators.get(msg.userId);
        if (user) {
          user.cursor = msg.payload?.cursor;
          user.activeTool = msg.payload?.activeTool;
          user.lastActive = Date.now();
        } else {
          this.collaborators.set(msg.userId, {
            id: msg.userId,
            name: msg.userName,
            color: msg.userColor,
            cursor: msg.payload?.cursor,
            activeTool: msg.payload?.activeTool,
            lastActive: Date.now(),
          });
        }
        this.core.emit('collab:cursor_moved', {
          userId: msg.userId,
          name: msg.userName,
          color: msg.userColor,
          cursor: msg.payload?.cursor,
          activeTool: msg.payload?.activeTool,
        });
        this.core.requestRender();
        break;
      }

      case 'entity:create': {
        this.isProcessingRemote = true;
        try {
          const ent = msg.payload as CADEntity;
          if (ent && !this.core.getEntity(ent.id)) {
            this.core.addEntity(ent);
            this.core.logCommandMessage(`[Collab] ${msg.userName} adicionou ${ent.type.toUpperCase()}`);
          }
        } finally {
          this.isProcessingRemote = false;
        }
        break;
      }

      case 'entity:update': {
        this.isProcessingRemote = true;
        try {
          const ent = msg.payload as CADEntity;
          if (ent) {
            this.core.updateEntity(ent);
          }
        } finally {
          this.isProcessingRemote = false;
        }
        break;
      }

      case 'entity:delete': {
        this.isProcessingRemote = true;
        try {
          const id = msg.payload?.id;
          if (id) {
            this.core.removeEntity(id);
            this.core.logCommandMessage(`[Collab] ${msg.userName} apagou objeto`);
          }
        } finally {
          this.isProcessingRemote = false;
        }
        break;
      }

      case 'chat': {
        this.core.emit('collab:message', {
          user: msg.userName,
          text: msg.payload?.text,
          color: msg.userColor,
        });
        this.core.logCommandMessage(`[Chat] ${msg.userName}: ${msg.payload?.text}`);
        break;
      }
    }
  }
}
