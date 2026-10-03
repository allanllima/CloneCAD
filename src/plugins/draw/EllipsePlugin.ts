import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  EllipseEntity,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class EllipseTool implements CADTool {
  public id = 'ellipse';
  public name = 'Ellipse';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'EL';

  private core: CADCoreAPI | null = null;
  private center: Point2D | null = null;
  private axisPoint: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.center = null;
    this.axisPoint = null;
    this.core.setPrompt('ELLIPSE Specify center of ellipse:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (!this.center) {
      this.center = { ...e.world };
      this.core.setPrompt('ELLIPSE Specify endpoint of axis:');
    } else if (!this.axisPoint) {
      this.axisPoint = { ...e.world };
      this.core.setPrompt('ELLIPSE Specify distance to other axis:');
    } else {
      const radiusX = Math.hypot(this.axisPoint.x - this.center.x, this.axisPoint.y - this.center.y);
      const rotation = Math.atan2(this.axisPoint.y - this.center.y, this.axisPoint.x - this.center.x);

      // Distance from cursor to major axis line
      const dx = e.world.x - this.center.x;
      const dy = e.world.y - this.center.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - rotation;
      const radiusY = Math.max(1, Math.abs(dist * Math.sin(angle)));

      if (radiusX > 0.01 && radiusY > 0.01) {
        const ellipse: EllipseEntity = {
          id: `ellipse_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'ellipse',
          layerId: this.core.getActiveLayer().id,
          center: { ...this.center },
          radiusX,
          radiusY,
          rotation,
          startAngle: 0,
          endAngle: Math.PI * 2,
          visible: true,
        };

        this.core.executeCommand(new AddEntityCommand(this.core, ellipse));
      }

      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.center) return;

    if (!this.axisPoint) {
      // Preview circle until first axis is set
      const radius = Math.hypot(e.world.x - this.center.x, e.world.y - this.center.y);
      const preview: EllipseEntity = {
        id: '__preview_ellipse__',
        type: 'ellipse',
        layerId: this.core.getActiveLayer().id,
        center: { ...this.center },
        radiusX: radius,
        radiusY: radius,
        rotation: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        visible: true,
      };
      this.core.setPreviewEntity(preview);
      this.core.setPrompt(`ELLIPSE Axis 1: ${radius.toFixed(2)}`);
    } else {
      const radiusX = Math.hypot(this.axisPoint.x - this.center.x, this.axisPoint.y - this.center.y);
      const rotation = Math.atan2(this.axisPoint.y - this.center.y, this.axisPoint.x - this.center.x);

      const dx = e.world.x - this.center.x;
      const dy = e.world.y - this.center.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - rotation;
      const radiusY = Math.max(1, Math.abs(dist * Math.sin(angle)));

      const preview: EllipseEntity = {
        id: '__preview_ellipse__',
        type: 'ellipse',
        layerId: this.core.getActiveLayer().id,
        center: { ...this.center },
        radiusX,
        radiusY,
        rotation,
        startAngle: 0,
        endAngle: Math.PI * 2,
        visible: true,
      };
      this.core.setPreviewEntity(preview);
      this.core.setPrompt(`ELLIPSE Major: ${radiusX.toFixed(2)}, Minor: ${radiusY.toFixed(2)}`);
    }
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.center = null;
    this.axisPoint = null;
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class EllipsePlugin implements CADPlugin {
  public id = 'draw-ellipse';
  public name = 'Ellipse Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new EllipseTool());
  }

  public destroy(): void {}
}
