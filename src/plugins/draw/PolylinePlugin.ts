import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
  PolylineEntity,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class PolylineTool implements CADTool {
  public id = 'polyline';
  public name = 'Polyline';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'PL';

  private core: CADCoreAPI | null = null;
  private points: Point2D[] = [];

  public getBasePoint(): Point2D | null {
    return this.points.length > 0 ? { ...this.points[this.points.length - 1] } : null;
  }

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.points = [];
    this.core.setPrompt('PLINE Specify start point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    this.points.push({ ...e.world });
    this.core.setPrompt(`PLINE Specify next point or [Enter/Esc to finish]: (${this.points.length} points)`);
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || this.points.length === 0) return;

    const preview: PolylineEntity = {
      id: '__preview_polyline__',
      type: 'polyline',
      layerId: this.core.getActiveLayer().id,
      points: [...this.points, { ...e.world }],
      closed: false,
      visible: true,
    };
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {
    if (e.button === 2) {
      this.finish(false);
    }
  }

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.finish(false);
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      this.finish(true);
    }
  }

  private finish(closed: boolean): void {
    if (this.core && this.points.length >= 2) {
      const poly: PolylineEntity = {
        id: `polyline_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'polyline',
        layerId: this.core.getActiveLayer().id,
        points: [...this.points],
        closed,
        visible: true,
      };
      this.core.executeCommand(new AddEntityCommand(this.core, poly));
    }
    this.cancel();
  }

  public cancel(): void {
    this.points = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class PolylinePlugin implements CADPlugin {
  public id = 'draw-polyline';
  public name = 'Polyline Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new PolylineTool());
  }

  public destroy(): void {}
}
