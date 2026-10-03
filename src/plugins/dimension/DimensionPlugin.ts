import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  DimensionEntity,
  CircleEntity,
  ArcEntity,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

// =============================================================================
// 1. DIMLINEAR TOOL (Horizontal / Vertical)
// =============================================================================
export class DimLinearTool implements CADTool {
  public id = 'dimlinear';
  public name = 'Linear Dimension';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'DLI';

  private core: CADCoreAPI | null = null;
  private p1: Point2D | null = null;
  private p2: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.p1 = null;
    this.p2 = null;
    this.core.setPrompt('DIMLINEAR: Specify first extension line origin:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.p1) {
      this.p1 = { ...pt };
      this.core.setPrompt('DIMLINEAR: Specify second extension line origin:');
    } else if (!this.p2) {
      this.p2 = { ...pt };
      this.core.setPrompt('DIMLINEAR: Specify dimension line location:');
    } else {
      // Place dimension
      const p1 = this.p1;
      const p2 = this.p2;
      const pd = pt;

      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);

      // Determine horizontal vs vertical based on cursor position relative to midpoint
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const distY = Math.abs(pd.y - mid.y);
      const distX = Math.abs(pd.x - mid.x);
      const isHorizontal = distY >= distX;

      const orientation = isHorizontal ? 'horizontal' : 'vertical';
      const measurement = isHorizontal ? dx : dy;

      const dimEnt: DimensionEntity = {
        id: `dim_${Date.now()}`,
        type: 'dimension',
        dimType: 'linear',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...p1 },
        defPoint2: { ...p2 },
        dimLinePoint: { ...pd },
        linearOrientation: orientation,
        measurement,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, dimEnt));
      this.core.logCommandMessage(`DIMLINEAR: ${measurement.toFixed(2)} placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.p1) return;
    const pt = e.world;

    if (this.p1 && !this.p2) {
      // Preview line between p1 and current cursor
      this.core.setPreviewEntity({
        id: 'preview_dim_ref',
        type: 'line',
        layerId: this.core.getActiveLayer().id,
        start: { ...this.p1 },
        end: { ...pt },
        visible: true,
      } as any);
      return;
    }

    if (this.p1 && this.p2) {
      const p1 = this.p1;
      const p2 = this.p2;
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const isHorizontal = Math.abs(pt.y - mid.y) >= Math.abs(pt.x - mid.x);
      const measurement = isHorizontal ? Math.abs(p2.x - p1.x) : Math.abs(p2.y - p1.y);

      this.core.setPreviewEntity({
        id: 'preview_dim',
        type: 'dimension',
        dimType: 'linear',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...p1 },
        defPoint2: { ...p2 },
        dimLinePoint: { ...pt },
        linearOrientation: isHorizontal ? 'horizontal' : 'vertical',
        measurement,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      });
    }
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    }
  }

  public cancel(): void {
    this.p1 = null;
    this.p2 = null;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

// =============================================================================
// 2. DIMALIGNED TOOL (Parallel / True Distance)
// =============================================================================
export class DimAlignedTool implements CADTool {
  public id = 'dimaligned';
  public name = 'Aligned Dimension';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'DAL';

  private core: CADCoreAPI | null = null;
  private p1: Point2D | null = null;
  private p2: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.p1 = null;
    this.p2 = null;
    this.core.setPrompt('DIMALIGNED: Specify first extension line origin:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.p1) {
      this.p1 = { ...pt };
      this.core.setPrompt('DIMALIGNED: Specify second extension line origin:');
    } else if (!this.p2) {
      this.p2 = { ...pt };
      this.core.setPrompt('DIMALIGNED: Specify dimension line location:');
    } else {
      const p1 = this.p1;
      const p2 = this.p2;
      const measurement = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      const dimEnt: DimensionEntity = {
        id: `dim_${Date.now()}`,
        type: 'dimension',
        dimType: 'aligned',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...p1 },
        defPoint2: { ...p2 },
        dimLinePoint: { ...pt },
        linearOrientation: 'aligned',
        measurement,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, dimEnt));
      this.core.logCommandMessage(`DIMALIGNED: ${measurement.toFixed(2)} placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.p1) return;
    const pt = e.world;

    if (this.p1 && !this.p2) {
      this.core.setPreviewEntity({
        id: 'preview_dim_ref',
        type: 'line',
        layerId: this.core.getActiveLayer().id,
        start: { ...this.p1 },
        end: { ...pt },
        visible: true,
      } as any);
      return;
    }

    if (this.p1 && this.p2) {
      const measurement = Math.hypot(this.p2.x - this.p1.x, this.p2.y - this.p1.y);
      this.core.setPreviewEntity({
        id: 'preview_dim',
        type: 'dimension',
        dimType: 'aligned',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...this.p1 },
        defPoint2: { ...this.p2 },
        dimLinePoint: { ...pt },
        linearOrientation: 'aligned',
        measurement,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      });
    }
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    }
  }

  public cancel(): void {
    this.p1 = null;
    this.p2 = null;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

// =============================================================================
// 3. DIMRADIUS TOOL (Radius with R prefix)
// =============================================================================
export class DimRadiusTool implements CADTool {
  public id = 'dimradius';
  public name = 'Radius Dimension';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'DRA';

  private core: CADCoreAPI | null = null;
  private center: Point2D | null = null;
  private chordPoint: Point2D | null = null;
  private radius: number = 0;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.center = null;
    this.chordPoint = null;
    this.core.setPrompt('DIMRADIUS: Select arc, circle, or specify center point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.center) {
      // Check if user clicked a circle or arc directly
      const clicked = (this.core as any).selection.pickEntity(
        this.core.getEntities(),
        pt,
        15 / this.core.getViewport().zoom
      );

      if (clicked && clicked.type === 'circle') {
        const c = clicked as CircleEntity;
        this.center = { ...c.center };
        this.radius = c.radius;
        const angle = Math.atan2(pt.y - c.center.y, pt.x - c.center.x);
        this.chordPoint = {
          x: c.center.x + Math.cos(angle) * c.radius,
          y: c.center.y + Math.sin(angle) * c.radius,
        };
        this.core.setPrompt('DIMRADIUS: Specify dimension line location:');
        return;
      } else if (clicked && clicked.type === 'arc') {
        const a = clicked as ArcEntity;
        this.center = { ...a.center };
        this.radius = a.radius;
        const angle = Math.atan2(pt.y - a.center.y, pt.x - a.center.x);
        this.chordPoint = {
          x: a.center.x + Math.cos(angle) * a.radius,
          y: a.center.y + Math.sin(angle) * a.radius,
        };
        this.core.setPrompt('DIMRADIUS: Specify dimension line location:');
        return;
      }

      // Manual point
      this.center = { ...pt };
      this.core.setPrompt('DIMRADIUS: Specify curve perimeter point:');
    } else if (!this.chordPoint) {
      this.chordPoint = { ...pt };
      this.radius = Math.hypot(pt.x - this.center.x, pt.y - this.center.y);
      this.core.setPrompt('DIMRADIUS: Specify dimension line location:');
    } else {
      // Place dimension
      const dimEnt: DimensionEntity = {
        id: `dim_${Date.now()}`,
        type: 'dimension',
        dimType: 'radial',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...this.center },
        defPoint2: { ...this.chordPoint },
        dimLinePoint: { ...pt },
        centerPoint: { ...this.center },
        chordPoint: { ...this.chordPoint },
        measurement: this.radius,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, dimEnt));
      this.core.logCommandMessage(`DIMRADIUS: R${this.radius.toFixed(2)} placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.center) return;
    const pt = e.world;

    if (this.center && this.chordPoint) {
      this.core.setPreviewEntity({
        id: 'preview_dim_rad',
        type: 'dimension',
        dimType: 'radial',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...this.center },
        defPoint2: { ...this.chordPoint },
        dimLinePoint: { ...pt },
        centerPoint: { ...this.center },
        chordPoint: { ...this.chordPoint },
        measurement: this.radius,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      });
    }
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    }
  }

  public cancel(): void {
    this.center = null;
    this.chordPoint = null;
    this.radius = 0;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

// =============================================================================
// 4. DIMDIAMETER TOOL (Diameter with Ø prefix)
// =============================================================================
export class DimDiameterTool implements CADTool {
  public id = 'dimdiameter';
  public name = 'Diameter Dimension';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'DDI';

  private core: CADCoreAPI | null = null;
  private center: Point2D | null = null;
  private chordPoint: Point2D | null = null;
  private diameter: number = 0;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.center = null;
    this.chordPoint = null;
    this.core.setPrompt('DIMDIAMETER: Select circle, arc, or specify center point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.center) {
      const clicked = (this.core as any).selection.pickEntity(
        this.core.getEntities(),
        pt,
        15 / this.core.getViewport().zoom
      );

      if (clicked && clicked.type === 'circle') {
        const c = clicked as CircleEntity;
        this.center = { ...c.center };
        this.diameter = c.radius * 2;
        const angle = Math.atan2(pt.y - c.center.y, pt.x - c.center.x);
        this.chordPoint = {
          x: c.center.x + Math.cos(angle) * c.radius,
          y: c.center.y + Math.sin(angle) * c.radius,
        };
        this.core.setPrompt('DIMDIAMETER: Specify dimension line location:');
        return;
      }

      this.center = { ...pt };
      this.core.setPrompt('DIMDIAMETER: Specify perimeter point:');
    } else if (!this.chordPoint) {
      this.chordPoint = { ...pt };
      this.diameter = 2 * Math.hypot(pt.x - this.center.x, pt.y - this.center.y);
      this.core.setPrompt('DIMDIAMETER: Specify dimension line location:');
    } else {
      const dimEnt: DimensionEntity = {
        id: `dim_${Date.now()}`,
        type: 'dimension',
        dimType: 'diameter',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...this.center },
        defPoint2: { ...this.chordPoint },
        dimLinePoint: { ...pt },
        centerPoint: { ...this.center },
        chordPoint: { ...this.chordPoint },
        measurement: this.diameter,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, dimEnt));
      this.core.logCommandMessage(`DIMDIAMETER: Ø${this.diameter.toFixed(2)} placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.center || !this.chordPoint) return;
    const pt = e.world;

    this.core.setPreviewEntity({
      id: 'preview_dim_diam',
      type: 'dimension',
      dimType: 'diameter',
      layerId: this.core.getActiveLayer().id,
      defPoint1: { ...this.center },
      defPoint2: { ...this.chordPoint },
      dimLinePoint: { ...pt },
      centerPoint: { ...this.center },
      chordPoint: { ...this.chordPoint },
      measurement: this.diameter,
      dimStyleId: this.core.getActiveDimStyle().id,
      visible: true,
    });
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    }
  }

  public cancel(): void {
    this.center = null;
    this.chordPoint = null;
    this.diameter = 0;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

// =============================================================================
// 5. DIMANGULAR TOOL (Angle between 2 rays/lines)
// =============================================================================
export class DimAngularTool implements CADTool {
  public id = 'dimangular';
  public name = 'Angular Dimension';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'DAN';

  private core: CADCoreAPI | null = null;
  private vertex: Point2D | null = null;
  private p1: Point2D | null = null;
  private p2: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.vertex = null;
    this.p1 = null;
    this.p2 = null;
    this.core.setPrompt('DIMANGULAR: Specify vertex point:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.vertex) {
      this.vertex = { ...pt };
      this.core.setPrompt('DIMANGULAR: Specify first ray endpoint:');
    } else if (!this.p1) {
      this.p1 = { ...pt };
      this.core.setPrompt('DIMANGULAR: Specify second ray endpoint:');
    } else if (!this.p2) {
      this.p2 = { ...pt };
      this.core.setPrompt('DIMANGULAR: Specify dimension arc location:');
    } else {
      const v = this.vertex;
      const a1 = Math.atan2(this.p1.y - v.y, this.p1.x - v.x);
      const a2 = Math.atan2(this.p2.y - v.y, this.p2.x - v.x);
      let diff = Math.abs(a2 - a1);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      const deg = (diff * 180) / Math.PI;

      const dimEnt: DimensionEntity = {
        id: `dim_${Date.now()}`,
        type: 'dimension',
        dimType: 'angular',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...v },
        defPoint2: { ...this.p1 },
        dimLinePoint: { ...pt },
        vertexPoint: { ...v },
        line1End: { ...this.p1 },
        line2End: { ...this.p2 },
        measurement: deg,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, dimEnt));
      this.core.logCommandMessage(`DIMANGULAR: ${deg.toFixed(1)}° placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.vertex || !this.p1 || !this.p2) return;
    const v = this.vertex;
    const a1 = Math.atan2(this.p1.y - v.y, this.p1.x - v.x);
    const a2 = Math.atan2(this.p2.y - v.y, this.p2.x - v.x);
    let diff = Math.abs(a2 - a1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const deg = (diff * 180) / Math.PI;

    this.core.setPreviewEntity({
      id: 'preview_dim_ang',
      type: 'dimension',
      dimType: 'angular',
      layerId: this.core.getActiveLayer().id,
      defPoint1: { ...v },
      defPoint2: { ...this.p1 },
      dimLinePoint: { ...e.world },
      vertexPoint: { ...v },
      line1End: { ...this.p1 },
      line2End: { ...this.p2 },
      measurement: deg,
      dimStyleId: this.core.getActiveDimStyle().id,
      visible: true,
    });
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    }
  }

  public cancel(): void {
    this.vertex = null;
    this.p1 = null;
    this.p2 = null;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

// =============================================================================
// 6. DIMORDINATE TOOL (Datum Origin Coordinates)
// =============================================================================
export class DimOrdinateTool implements CADTool {
  public id = 'dimordinate';
  public name = 'Ordinate Dimension';
  public category: 'annotation' = 'annotation';
  public cursor = 'crosshair';
  public shortcut = 'DOR';

  private core: CADCoreAPI | null = null;
  private featurePoint: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.featurePoint = null;
    this.core.setPrompt('DIMORDINATE: Specify feature location:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;
    const pt = e.world;

    if (!this.featurePoint) {
      this.featurePoint = { ...pt };
      this.core.setPrompt('DIMORDINATE: Specify leader endpoint:');
    } else {
      const f = this.featurePoint;
      const dx = Math.abs(pt.x - f.x);
      const dy = Math.abs(pt.y - f.y);
      const axis = dx >= dy ? 'X' : 'Y';
      const measurement = axis === 'X' ? f.x : f.y;

      const dimEnt: DimensionEntity = {
        id: `dim_${Date.now()}`,
        type: 'dimension',
        dimType: 'ordinate',
        layerId: this.core.getActiveLayer().id,
        defPoint1: { ...f },
        defPoint2: { ...pt },
        dimLinePoint: { ...pt },
        featureLocation: { ...f },
        leaderEndPoint: { ...pt },
        ordinateAxis: axis,
        datumOrigin: { x: 0, y: 0 },
        measurement,
        dimStyleId: this.core.getActiveDimStyle().id,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, dimEnt));
      this.core.logCommandMessage(`DIMORDINATE: ${axis}=${measurement.toFixed(2)} placed.`);
      this.cancel();
      this.core.setActiveTool('select');
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.featurePoint) return;
    const pt = e.world;
    const f = this.featurePoint;
    const axis = Math.abs(pt.x - f.x) >= Math.abs(pt.y - f.y) ? 'X' : 'Y';
    const measurement = axis === 'X' ? f.x : f.y;

    this.core.setPreviewEntity({
      id: 'preview_dim_ord',
      type: 'dimension',
      dimType: 'ordinate',
      layerId: this.core.getActiveLayer().id,
      defPoint1: { ...f },
      defPoint2: { ...pt },
      dimLinePoint: { ...pt },
      featureLocation: { ...f },
      leaderEndPoint: { ...pt },
      ordinateAxis: axis,
      datumOrigin: { x: 0, y: 0 },
      measurement,
      dimStyleId: this.core.getActiveDimStyle().id,
      visible: true,
    });
  }

  public onPointerUp(_e: CADPointerEvent): void {}

  public onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel();
      this.core?.setActiveTool('select');
    }
  }

  public cancel(): void {
    this.featurePoint = null;
    this.core?.setPreviewEntity(null);
    this.core?.setPrompt('Command:');
  }
}

// =============================================================================
// DIMENSION PLUGIN REGISTRATION
// =============================================================================
export class DimensionPlugin implements CADPlugin {
  public id = 'dimension-tools';
  public name = 'Dimension Tools (ABNT/ISO)';
  public version = '1.0.0';
  public category: 'annotation' = 'annotation';

  public init(core: CADCoreAPI): void {
    core.registerTool(new DimLinearTool());
    core.registerTool(new DimAlignedTool());
    core.registerTool(new DimRadiusTool());
    core.registerTool(new DimDiameterTool());
    core.registerTool(new DimAngularTool());
    core.registerTool(new DimOrdinateTool());
  }
}
