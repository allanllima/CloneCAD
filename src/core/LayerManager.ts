import { CADLayer } from './types';

export class LayerManager {
  private layers: Map<string, CADLayer> = new Map();
  private activeLayerId: string = '0';
  private onChangeCallback?: () => void;

  constructor(onChange?: () => void) {
    this.onChangeCallback = onChange;
    // Default AutoCAD Layer "0"
    this.addLayer({
      id: '0',
      name: '0',
      color: '#ffffff',
      visible: true,
      locked: false,
      lineWeight: 1,
      lineType: 'continuous',
    });
  }

  public setOnChange(cb: () => void): void {
    this.onChangeCallback = cb;
  }

  public getLayers(): CADLayer[] {
    return Array.from(this.layers.values());
  }

  public getLayer(id: string): CADLayer | undefined {
    return this.layers.get(id);
  }

  public getActiveLayer(): CADLayer {
    return this.layers.get(this.activeLayerId) || this.layers.get('0')!;
  }

  public setActiveLayer(layerId: string): void {
    if (this.layers.has(layerId)) {
      this.activeLayerId = layerId;
      this.onChangeCallback?.();
    }
  }

  public addLayer(layer: CADLayer): void {
    this.layers.set(layer.id, { ...layer });
    this.onChangeCallback?.();
  }

  public updateLayer(layer: CADLayer): void {
    if (this.layers.has(layer.id)) {
      this.layers.set(layer.id, { ...layer });
      this.onChangeCallback?.();
    }
  }

  public removeLayer(layerId: string): void {
    if (layerId === '0') return; // Cannot delete layer 0
    this.layers.delete(layerId);
    if (this.activeLayerId === layerId) {
      this.activeLayerId = '0';
    }
    this.onChangeCallback?.();
  }
}
