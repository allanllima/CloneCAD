import { CADCoreEvent } from './types';

export class EventBus {
  private listeners: Map<CADCoreEvent, Set<(...args: any[]) => void>> = new Map();

  public on(event: CADCoreEvent, handler: (...args: any[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  public off(event: CADCoreEvent, handler: (...args: any[]) => void): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit(event: CADCoreEvent, ...args: any[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(...args);
        } catch (err) {
          console.error(`Error in event handler for "${event}":`, err);
        }
      });
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
