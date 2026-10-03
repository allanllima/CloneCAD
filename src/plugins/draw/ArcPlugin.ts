import {
  ArcEntity,
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class ArcTool implements CADTool {
  public id = 'arc';
  public name = 'Arc';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'A';

  private core: CADCoreAPI | null = null;
  private pts: Point2D[] = [];

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.pts = [];
    this.core.setPrompt('ARC Specify start point of arc:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    this.pts.push({ ...e.world });

    if (this.pts.length === 1) {
      this.core.setPrompt('ARC Specify second point of arc:');
    } else if (this.pts.length === 2) {
      this.core.setPrompt('ARC Specify end point of arc:');
    } else if (this.pts.length === 3) {
      const p1 = this.pts[0];
      const p2 = this.pts[1];
      const p3 = this.pts[2];

      const arcParams = this.calculate3PointArc(p1, p2, p3);
      if (arcParams) {
        const arcEntity: ArcEntity = {
          id: `arc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          type: 'arc',
          layerId: this.core.getActiveLayer().id,
          center: arcParams.center,
          radius: arcParams.radius,
          startAngle: arcParams.startAngle,
          endAngle: arcParams.endAngle,
          visible: true,
        };

        this.core.executeCommand(new AddEntityCommand(this.core, arcEntity));
      }
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || this.pts.length !== 2) return;

    const p1 = this.pts[0];
    const p2 = this.pts[1];
    const p3 = e.world;

    const arcParams = this.calculate3PointArc(p1, p2, p3);
    if (arcParams) {
      const preview: ArcEntity = {
        id: '__preview_arc__',
        type: 'arc',
        layerId: this.core.getActiveLayer().id,
        center: arcParams.center,
        radius: arcParams.radius,
        startAngle: arcParams.startAngle,
        endAngle: arcParams.endAngle,
        visible: true,
      };
      this.core.setPreviewEntity(preview);
    }
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.pts = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private calculate3PointArc(
    p1: Point2D,
    p2: Point2D,
    p3: Point2D
  ): { center: Point2D; radius: number; startAngle: number; endAngle: number } | null {
    const d = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
    if (Math.abs(d) < 0.0001) return null; // Collinear

    const p1Sq = p1.x * p1.x + p1.y * p1.y;
    const p2Sq = p2.x * p2.x + p2.y * p2.y;
    const p3Sq = p3.x * p3.x + p3.y * p3.y;

    const cx = (p1Sq * (p2.y - p3.y) + p2Sq * (p3.y - p1.y) + p3Sq * (p1.y - p2.y)) / d;
    const cy = (p1Sq * (p3.x - p2.x) + p2Sq * (p1.x - p3.x) + p3Sq * (p2.x - p1.x)) / d;
    const center = { x: cx, y: cy };
    const radius = Math.hypot(p1.x - cx, p1.y - cy);

    let a1 = Math.atan2(p1.y - cy, p1.x - cx);
    let a2 = Math.atan2(p2.y - cy, p2.x - cx);
    let a3 = Math.atan2(p3.y - cy, p3.x - cx);

    if (a1 < 0) a1 += Math.PI * 2;
    if (a2 < 0) a2 += Math.PI * 2;
    if (a3 < 0) a3 += Math.PI * 2;

    // Check direction (counterclockwise)
    let isCCW = false;
    if (a1 < a3) {
      isCCW = a1 < a2 && a2 < a3;
    } else {
      isCCW = a2 > a1 || a2 < a3;
    }

    let startAngle = a1;
    let endAngle = a3;
    if (!isCCW) {
      startAngle = a3;
      endAngle = a1;
    }

    return { center, radius, startAngle, endAngle };
  }
}

export class ArcPlugin implements CADPlugin {
  public id = 'draw-arc';
  public name = 'Arc Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new ArcTool());
  }

  public destroy(): void {}
}
