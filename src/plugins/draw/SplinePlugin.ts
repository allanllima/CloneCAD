import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
  SplineEntity,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class SplineTool implements CADTool {
  public id = 'spline';
  public name = 'Spline';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'SPL';

  private core: CADCoreAPI | null = null;
  private controlPoints: Point2D[] = [];

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.controlPoints = [];
    this.core.setPrompt('SPLINE Specify first point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    this.controlPoints.push({ ...e.world });
    this.core.setPrompt(
      `SPLINE Specify next point or [Enter/Space to finish]: (${this.controlPoints.length} points)`
    );
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || this.controlPoints.length === 0) return;

    const preview: SplineEntity = {
      id: '__preview_spline__',
      type: 'spline',
      layerId: this.core.getActiveLayer().id,
      controlPoints: [...this.controlPoints, { ...e.world }],
      degree: 3,
      closed: false,
      visible: true,
    };
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {
    if (e.button === 2) {
      this.finish();
    }
  }

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.finish();
    }
  }

  private finish(): void {
    if (this.core && this.controlPoints.length >= 2) {
      const spline: SplineEntity = {
        id: `spline_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'spline',
        layerId: this.core.getActiveLayer().id,
        controlPoints: [...this.controlPoints],
        degree: 3,
        closed: false,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, spline));
    }
    this.cancel();
  }

  public cancel(): void {
    this.controlPoints = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class SplinePlugin implements CADPlugin {
  public id = 'draw-spline';
  public name = 'Spline Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new SplineTool());
  }

  public destroy(): void {}
}
