import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
  RectangleEntity,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class RectangleTool implements CADTool {
  public id = 'rectangle';
  public name = 'Rectangle';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'REC';

  private core: CADCoreAPI | null = null;
  private firstCorner: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.firstCorner = null;
    this.core.setPrompt('RECTANG Specify first corner point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (!this.firstCorner) {
      this.firstCorner = { ...e.world };
      this.core.setPrompt('RECTANG Specify other corner point:');
    } else {
      const origin: Point2D = {
        x: Math.min(this.firstCorner.x, e.world.x),
        y: Math.min(this.firstCorner.y, e.world.y),
      };
      const width = Math.abs(e.world.x - this.firstCorner.x);
      const height = Math.abs(e.world.y - this.firstCorner.y);

      if (width > 0.001 || height > 0.001) {
        const rectEntity: RectangleEntity = {
          id: `rect_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'rectangle',
          layerId: this.core.getActiveLayer().id,
          origin,
          width,
          height,
          visible: true,
        };

        const cmd = new AddEntityCommand(this.core, rectEntity);
        this.core.executeCommand(cmd);
      }
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.firstCorner) return;

    const origin: Point2D = {
      x: Math.min(this.firstCorner.x, e.world.x),
      y: Math.min(this.firstCorner.y, e.world.y),
    };
    const width = Math.abs(e.world.x - this.firstCorner.x);
    const height = Math.abs(e.world.y - this.firstCorner.y);

    const preview: RectangleEntity = {
      id: '__preview_rect__',
      type: 'rectangle',
      layerId: this.core.getActiveLayer().id,
      origin,
      width,
      height,
      visible: true,
    };
    this.core.setPreviewEntity(preview);
    this.core.setPrompt(`RECTANG Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)}`);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.firstCorner = null;
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class RectanglePlugin implements CADPlugin {
  public id = 'draw-rectangle';
  public name = 'Rectangle Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new RectangleTool());
  }

  public destroy(): void {}
}
