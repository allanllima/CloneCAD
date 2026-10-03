import { Point2D, ViewportState, BoundingBox2D } from './types';

export class Viewport {
  private state: ViewportState = {
    cameraX: 0,
    cameraY: 0,
    zoom: 1.0, // 1 world unit = 1 screen pixel at zoom 1.0
    width: 800,
    height: 600,
  };

  private minZoom = 0.001;
  private maxZoom = 1000.0;

  constructor(width = 800, height = 600) {
    this.state.width = width;
    this.state.height = height;
  }

  public getState(): ViewportState {
    return { ...this.state };
  }

  public setDimensions(width: number, height: number): void {
    this.state.width = Math.max(1, width);
    this.state.height = Math.max(1, height);
  }

  public setState(updates: Partial<ViewportState>): void {
    if (updates.zoom !== undefined) {
      updates.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, updates.zoom));
    }
    this.state = { ...this.state, ...updates };
  }

  /**
   * Convert Screen coordinate (HTML pixels from top-left) to World coordinate (+Y up)
   */
  public screenToWorld(screenX: number, screenY: number): Point2D {
    const { cameraX, cameraY, zoom, width, height } = this.state;
    return {
      x: cameraX + (screenX - width / 2) / zoom,
      y: cameraY - (screenY - height / 2) / zoom,
    };
  }

  /**
   * Convert World coordinate to Screen coordinate (HTML pixels from top-left)
   */
  public worldToScreen(worldX: number, worldY: number): Point2D {
    const { cameraX, cameraY, zoom, width, height } = this.state;
    return {
      x: width / 2 + (worldX - cameraX) * zoom,
      y: height / 2 - (worldY - cameraY) * zoom,
    };
  }

  /**
   * Pan camera by delta screen pixels
   */
  public panByScreenDelta(dx: number, dy: number): void {
    const { zoom } = this.state;
    // Dragging right (+dx) moves camera left (-worldX) so world moves right
    this.state.cameraX -= dx / zoom;
    // Dragging down (+dy) moves camera up (+worldY) so world moves down
    this.state.cameraY += dy / zoom;
  }

  /**
   * Smooth cursor-centered zoom
   */
  public zoomAt(screenX: number, screenY: number, factor: number): void {
    const worldBefore = this.screenToWorld(screenX, screenY);
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.state.zoom * factor));

    this.state.zoom = newZoom;
    this.state.cameraX = worldBefore.x - (screenX - this.state.width / 2) / newZoom;
    this.state.cameraY = worldBefore.y + (screenY - this.state.height / 2) / newZoom;
  }

  /**
   * Zoom extents to fit a given bounding box
   */
  public zoomToBounds(box: BoundingBox2D, padding = 60): void {
    const boxWidth = Math.max(box.maxX - box.minX, 10);
    const boxHeight = Math.max(box.maxY - box.minY, 10);

    const availWidth = Math.max(this.state.width - padding * 2, 50);
    const availHeight = Math.max(this.state.height - padding * 2, 50);

    const zoomX = availWidth / boxWidth;
    const zoomY = availHeight / boxHeight;
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zoomX, zoomY)));

    this.state.zoom = newZoom;
    this.state.cameraX = (box.minX + box.maxX) / 2;
    this.state.cameraY = (box.minY + box.maxY) / 2;
  }

  /**
   * Visible world bounding box in current viewport
   */
  public getVisibleBounds(): BoundingBox2D {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.state.width, this.state.height);
    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: bottomRight.y,
      maxY: topLeft.y,
    };
  }
}
