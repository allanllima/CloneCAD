import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  HatchEntity,
  HatchPattern,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class HatchTool implements CADTool {
  public id = 'hatch';
  public name = 'Hatch';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'H';

  private core: CADCoreAPI | null = null;
  private boundaryPoints: Point2D[] = [];
  private pattern: HatchPattern = 'ANSI31';
  private scale = 12;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.boundaryPoints = [];
    this.core.setPrompt('HATCH Click closed object (Rectangle, Circle, Polyline) or define boundary points:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    // Check if clicked directly on an existing entity to extract boundary
    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (clicked && this.boundaryPoints.length === 0) {
      const boundary = this.extractBoundary(clicked);
      if (boundary && boundary.length >= 3) {
        this.commitHatch(boundary);
        return;
      }
    }

    // Otherwise, collect boundary points interactively
    this.boundaryPoints.push({ ...e.world });
    this.core.setPrompt(
      `HATCH Boundary point ${this.boundaryPoints.length} added. [Enter/Space to finish, Esc to cancel]`
    );
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || this.boundaryPoints.length < 2) return;

    const preview: HatchEntity = {
      id: '__preview_hatch__',
      type: 'hatch',
      layerId: this.core.getActiveLayer().id,
      boundary: [...this.boundaryPoints, { ...e.world }],
      pattern: this.pattern,
      scale: this.scale,
      angle: Math.PI / 4,
      fillColor: '#007acc',
      opacity: 0.25,
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
    if (this.core && this.boundaryPoints.length >= 3) {
      this.commitHatch(this.boundaryPoints);
    }
    this.cancel();
  }

  private commitHatch(boundary: Point2D[]): void {
    if (!this.core) return;
    const hatch: HatchEntity = {
      id: `hatch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'hatch',
      layerId: this.core.getActiveLayer().id,
      boundary: [...boundary],
      pattern: this.pattern,
      scale: this.scale,
      angle: Math.PI / 4,
      fillColor: '#007acc',
      opacity: 0.3,
      visible: true,
    };

    this.core.executeCommand(new AddEntityCommand(this.core, hatch, `HATCH (${this.pattern})`));
    this.core.logCommandMessage(`HATCH created with pattern ${this.pattern}.`);
    this.cancel();
  }

  private extractBoundary(ent: CADEntity): Point2D[] | null {
    if (ent.type === 'rectangle') {
      const r = ent as any;
      return [
        { x: r.origin.x, y: r.origin.y },
        { x: r.origin.x + r.width, y: r.origin.y },
        { x: r.origin.x + r.width, y: r.origin.y + r.height },
        { x: r.origin.x, y: r.origin.y + r.height },
      ];
    } else if (ent.type === 'circle') {
      const c = ent as any;
      const pts: Point2D[] = [];
      const segments = 48;
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        pts.push({
          x: c.center.x + Math.cos(theta) * c.radius,
          y: c.center.y + Math.sin(theta) * c.radius,
        });
      }
      return pts;
    } else if (ent.type === 'polyline') {
      const poly = ent as any;
      if (poly.points && poly.points.length >= 3) {
        return poly.points.map((p: any) => ({ x: p.x, y: p.y }));
      }
    }
    return null;
  }

  public cancel(): void {
    this.boundaryPoints = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class HatchPlugin implements CADPlugin {
  public id = 'draw-hatch';
  public name = 'Hatch Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new HatchTool());
  }

  public destroy(): void {}
}
