import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  CircleEntity,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class CircleTool implements CADTool {
  public id = 'circle';
  public name = 'Circle';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'C';

  private core: CADCoreAPI | null = null;
  private center: Point2D | null = null;

  public getBasePoint(): Point2D | null {
    return this.center ? { ...this.center } : null;
  }

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.center = null;
    this.core.setPrompt('CIRCLE Specify center point for circle:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.center = null;
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (!this.center) {
      this.center = { ...e.world };
      this.core.setPrompt('CIRCLE Specify radius of circle:');
    } else {
      const radius = Math.hypot(e.world.x - this.center.x, e.world.y - this.center.y);
      if (radius > 0.001) {
        const circleEntity: CircleEntity = {
          id: `circle_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'circle',
          layerId: this.core.getActiveLayer().id,
          center: { ...this.center },
          radius,
          visible: true,
        };

        const cmd = new AddEntityCommand(this.core, circleEntity);
        this.core.executeCommand(cmd);
      }
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.center) return;

    const radius = Math.hypot(e.world.x - this.center.x, e.world.y - this.center.y);
    const preview: CircleEntity = {
      id: '__preview_circle__',
      type: 'circle',
      layerId: this.core.getActiveLayer().id,
      center: { ...this.center },
      radius,
      visible: true,
    };
    this.core.setPreviewEntity(preview);
    this.core.setPrompt(`CIRCLE Radius: ${radius.toFixed(2)}`);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.center = null;
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class CirclePlugin implements CADPlugin {
  public id = 'draw-circle';
  public name = 'Circle Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new CircleTool());
  }

  public destroy(): void {}
}
