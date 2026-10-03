import { CADEntity, BigDataStressOptions } from '../types';
import { FrustumCuller, BoundingBox2D } from '../gpu/FrustumCuller';

export interface WorkerTaskMessage {
  id: string;
  type: 'generate_stress' | 'batch_aabbs' | 'ping';
  payload: any;
}

export interface WorkerResponseMessage {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
}

export class CADWorkerBridge {
  private static instance: CADWorkerBridge;
  private worker: Worker | null = null;
  private isWorkerSupported: boolean = false;
  private callbacks: Map<string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();

  private constructor() {
    this.initWorker();
  }

  public static getInstance(): CADWorkerBridge {
    if (!CADWorkerBridge.instance) {
      CADWorkerBridge.instance = new CADWorkerBridge();
    }
    return CADWorkerBridge.instance;
  }

  private initWorker(): void {
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined') {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const data = e.data;
            const id = data.id;
            try {
              if (data.type === 'ping') {
                self.postMessage({ id: id, success: true, result: 'pong' });
              } else if (data.type === 'generate_stress') {
                const count = data.payload.count || 1000;
                const area = data.payload.areaSize || 2000;
                const entityType = data.payload.entityType || 'mixed';
                const colors = ['#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2'];
                const half = area / 2;
                const entities = [];

                for (let i = 0; i < count; i++) {
                  const entId = 'stress_' + (Date.now().toString(36)) + '_' + i;
                  const color = colors[i % colors.length];
                  const type = entityType === 'mixed'
                    ? (i % 3 === 0 ? 'line' : (i % 3 === 1 ? 'circle' : 'rectangle'))
                    : entityType;

                  const x = (Math.random() - 0.5) * area;
                  const y = (Math.random() - 0.5) * area;

                  if (type === 'line') {
                    const len = 20 + Math.random() * 80;
                    const angle = Math.random() * Math.PI * 2;
                    entities.push({
                      id: entId,
                      type: 'line',
                      layerId: '0',
                      color: color,
                      start: { x: x, y: y },
                      end: { x: x + Math.cos(angle) * len, y: y + Math.sin(angle) * len },
                      visible: true,
                    });
                  } else if (type === 'circle') {
                    const radius = 10 + Math.random() * 40;
                    entities.push({
                      id: entId,
                      type: 'circle',
                      layerId: '0',
                      color: color,
                      center: { x: x, y: y },
                      radius: radius,
                      visible: true,
                    });
                  } else {
                    const w = 15 + Math.random() * 60;
                    const h = 15 + Math.random() * 60;
                    entities.push({
                      id: entId,
                      type: 'rectangle',
                      layerId: '0',
                      color: color,
                      basePoint: { x: x, y: y },
                      width: w,
                      height: h,
                      visible: true,
                    });
                  }
                }
                self.postMessage({ id: id, success: true, result: entities });
              } else {
                self.postMessage({ id: id, success: false, error: 'Unknown worker task' });
              }
            } catch (err) {
              self.postMessage({ id: id, success: false, error: String(err) });
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        this.worker = new Worker(url);

        this.worker.onmessage = (event: MessageEvent<WorkerResponseMessage>) => {
          const { id, success, result, error } = event.data;
          const cb = this.callbacks.get(id);
          if (cb) {
            this.callbacks.delete(id);
            if (success) {
              cb.resolve(result);
            } else {
              cb.reject(new Error(error || 'Worker execution failed'));
            }
          }
        };

        this.isWorkerSupported = true;
      } catch {
        this.isWorkerSupported = false;
        this.worker = null;
      }
    } else {
      this.isWorkerSupported = false;
    }
  }

  public isWorkerActive(): boolean {
    return this.isWorkerSupported && this.worker !== null;
  }

  /**
   * Executes a task off-thread using the Web Worker or falls back gracefully on the main thread.
   */
  public async postTask<T = any>(type: 'generate_stress' | 'batch_aabbs' | 'ping', payload: any): Promise<T> {
    const taskId = 'task_' + Math.random().toString(36).substring(2, 9);

    if (this.isWorkerActive() && this.worker) {
      return new Promise<T>((resolve, reject) => {
        this.callbacks.set(taskId, { resolve, reject });
        this.worker!.postMessage({
          id: taskId,
          type,
          payload,
        });
      });
    }

    // Direct synchronous fallback
    return this.fallbackExecute<T>(type, payload);
  }

  private fallbackExecute<T>(type: string, payload: any): Promise<T> {
    if (type === 'generate_stress') {
      const count = payload.count || 1000;
      const area = payload.areaSize || 2000;
      const entityType = payload.entityType || 'mixed';
      const colors = ['#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2'];
      const entities: CADEntity[] = [];

      for (let i = 0; i < count; i++) {
        const entId = 'stress_' + Date.now().toString(36) + '_' + i;
        const color = colors[i % colors.length];
        const type =
          entityType === 'mixed'
            ? i % 3 === 0
              ? 'line'
              : i % 3 === 1
              ? 'circle'
              : 'rectangle'
            : entityType;

        const x = (Math.random() - 0.5) * area;
        const y = (Math.random() - 0.5) * area;

        if (type === 'line') {
          const len = 20 + Math.random() * 80;
          const angle = Math.random() * Math.PI * 2;
          entities.push({
            id: entId,
            type: 'line',
            layerId: '0',
            color: color,
            start: { x: x, y: y },
            end: { x: x + Math.cos(angle) * len, y: y + Math.sin(angle) * len },
            visible: true,
          } as any);
        } else if (type === 'circle') {
          const radius = 10 + Math.random() * 40;
          entities.push({
            id: entId,
            type: 'circle',
            layerId: '0',
            color: color,
            center: { x: x, y: y },
            radius: radius,
            visible: true,
          } as any);
        } else {
          const w = 15 + Math.random() * 60;
          const h = 15 + Math.random() * 60;
          entities.push({
            id: entId,
            type: 'rectangle',
            layerId: '0',
            color: color,
            basePoint: { x: x, y: y },
            width: w,
            height: h,
            visible: true,
          } as any);
        }
      }
      return Promise.resolve(entities as unknown as T);
    } else if (type === 'ping') {
      return Promise.resolve('pong' as unknown as T);
    }

    return Promise.resolve(null as unknown as T);
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isWorkerSupported = false;
    this.callbacks.clear();
  }
}
