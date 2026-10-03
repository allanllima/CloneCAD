import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  LineEntity,
  Point2D,
} from '../../core/types';

export class MeasureTool implements CADTool {
  public id = 'measure';
  public name = 'Measure Distance';
  public category: 'utility' = 'utility';
  public cursor = 'crosshair';
  public shortcut = 'DI';

  private core: CADCoreAPI | null = null;
  private firstPoint: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.firstPoint = null;
    this.core.setPrompt('DIST Specify first point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (!this.firstPoint) {
      this.firstPoint = { ...e.world };
      this.core.setPrompt('DIST Specify second point:');
    } else {
      const dx = e.world.x - this.firstPoint.x;
      const dy = e.world.y - this.firstPoint.y;
      const dist = Math.hypot(dx, dy);
      const angleRad = Math.atan2(dy, dx);
      const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

      this.core.logCommandMessage(
        `DIST: Distance = ${dist.toFixed(4)}, Angle in XY Plane = ${angleDeg.toFixed(2)}°, Delta X = ${dx.toFixed(4)}, Delta Y = ${dy.toFixed(4)}`
      );
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.firstPoint) return;

    const dx = e.world.x - this.firstPoint.x;
    const dy = e.world.y - this.firstPoint.y;
    const dist = Math.hypot(dx, dy);

    const preview: LineEntity = {
      id: '__preview_dist__',
      type: 'line',
      layerId: this.core.getActiveLayer().id,
      start: { ...this.firstPoint },
      end: { ...e.world },
      visible: true,
    };
    this.core.setPreviewEntity(preview);
    this.core.setPrompt(`DIST Distance: ${dist.toFixed(2)} | Delta X: ${dx.toFixed(2)}, Y: ${dy.toFixed(2)}`);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.firstPoint = null;
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class MeasurePlugin implements CADPlugin {
  public id = 'utility-measure';
  public name = 'Measure Distance';
  public version = '1.0.0';
  public category: 'utility' = 'utility';

  public init(core: CADCoreAPI): void {
    core.registerTool(new MeasureTool());
  }

  public destroy(): void {}
}
