import {
  ArcEntity,
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  LineEntity,
  Point2D,
} from '../../core/types';
import { ModifyEntityCommand } from '../../commands/ModifyEntityCommand';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';
import { IntersectionUtils } from '../../core/geometry/IntersectionUtils';

export class FilletTool implements CADTool {
  public id = 'fillet';
  public name = 'Fillet';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'F';

  private core: CADCoreAPI | null = null;
  private radius = 15;
  private firstLine: LineEntity | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.firstLine = null;
    this.core.setPrompt(`FILLET Radius = ${this.radius}. Select first line:`);
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (!clicked || clicked.type !== 'line') {
      this.core.setPrompt('Please select a line entity.');
      return;
    }

    const line = clicked as LineEntity;

    if (!this.firstLine) {
      this.firstLine = line;
      this.core.setPrompt('FILLET Select second line:');
    } else {
      if (this.firstLine.id === line.id) return;
      this.applyFillet(this.firstLine, line);
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.firstLine = null;
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private applyFillet(line1: LineEntity, line2: LineEntity): void {
    if (!this.core) return;

    const inter = IntersectionUtils.lineLineIntersection(
      line1.start,
      line1.end,
      line2.start,
      line2.end
    );
    if (!inter) {
      this.core.logCommandMessage('Lines are parallel, cannot fillet.');
      return;
    }

    // Direction vectors from intersection pointing along the lines
    const v1 = this.getOutwardVector(inter, line1);
    const v2 = this.getOutwardVector(inter, line2);

    const cosTheta = v1.x * v2.x + v1.y * v2.y;
    const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
    if (theta < 1e-3 || Math.abs(theta - Math.PI) < 1e-3) {
      this.core.logCommandMessage('Lines are collinear or parallel.');
      return;
    }

    // Distance from corner to tangent points
    const tanDist = this.radius / Math.tan(theta / 2);

    const t1: Point2D = { x: inter.x + v1.x * tanDist, y: inter.y + v1.y * tanDist };
    const t2: Point2D = { x: inter.x + v2.x * tanDist, y: inter.y + v2.y * tanDist };

    // Center of fillet circle
    const bisector = { x: v1.x + v2.x, y: v1.y + v2.y };
    const bisectorLen = Math.hypot(bisector.x, bisector.y);
    const bisectorUnit = { x: bisector.x / bisectorLen, y: bisector.y / bisectorLen };
    const centerDist = this.radius / Math.sin(theta / 2);
    const center: Point2D = {
      x: inter.x + bisectorUnit.x * centerDist,
      y: inter.y + bisectorUnit.y * centerDist,
    };

    // Calculate arc angles
    let a1 = Math.atan2(t1.y - center.y, t1.x - center.x);
    let a2 = Math.atan2(t2.y - center.y, t2.x - center.x);

    // Modify line 1 and line 2 endpoints closest to intersection
    const updatedLine1 = JSON.parse(JSON.stringify(line1));
    if (Math.hypot(line1.start.x - inter.x, line1.start.y - inter.y) < Math.hypot(line1.end.x - inter.x, line1.end.y - inter.y)) {
      updatedLine1.start = t1;
    } else {
      updatedLine1.end = t1;
    }

    const updatedLine2 = JSON.parse(JSON.stringify(line2));
    if (Math.hypot(line2.start.x - inter.x, line2.start.y - inter.y) < Math.hypot(line2.end.x - inter.x, line2.end.y - inter.y)) {
      updatedLine2.start = t2;
    } else {
      updatedLine2.end = t2;
    }

    // Create fillet arc
    let startAngle = a1;
    let endAngle = a2;
    if (endAngle < startAngle) endAngle += Math.PI * 2;
    if (endAngle - startAngle > Math.PI) {
      startAngle = a2;
      endAngle = a1;
      if (endAngle < startAngle) endAngle += Math.PI * 2;
    }

    const arc: ArcEntity = {
      id: `fillet_arc_${Date.now()}`,
      type: 'arc',
      layerId: line1.layerId,
      center,
      radius: this.radius,
      startAngle,
      endAngle,
      visible: true,
    };

    const cmd1 = new ModifyEntityCommand(this.core, line1, updatedLine1);
    const cmd2 = new ModifyEntityCommand(this.core, line2, updatedLine2);
    const cmd3 = new AddEntityCommand(this.core, arc);

    const batch = new CompositeCommand([cmd1, cmd2, cmd3], `FILLET (R=${this.radius})`);
    this.core.executeCommand(batch);
    this.core.logCommandMessage(`FILLET created with radius ${this.radius}.`);
  }

  private getOutwardVector(corner: Point2D, line: LineEntity): Point2D {
    const dStart = Math.hypot(line.start.x - corner.x, line.start.y - corner.y);
    const dEnd = Math.hypot(line.end.x - corner.x, line.end.y - corner.y);
    const farPt = dStart > dEnd ? line.start : line.end;
    const dx = farPt.x - corner.x;
    const dy = farPt.y - corner.y;
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }
}

export class ChamferTool implements CADTool {
  public id = 'chamfer';
  public name = 'Chamfer';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'CHA';

  private core: CADCoreAPI | null = null;
  private dist = 15;
  private firstLine: LineEntity | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.firstLine = null;
    this.core.setPrompt(`CHAMFER Distance = ${this.dist}. Select first line:`);
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (!clicked || clicked.type !== 'line') return;
    const line = clicked as LineEntity;

    if (!this.firstLine) {
      this.firstLine = line;
      this.core.setPrompt('CHAMFER Select second line:');
    } else {
      if (this.firstLine.id === line.id) return;
      this.applyChamfer(this.firstLine, line);
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.firstLine = null;
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private applyChamfer(line1: LineEntity, line2: LineEntity): void {
    if (!this.core) return;
    const inter = IntersectionUtils.lineLineIntersection(line1.start, line1.end, line2.start, line2.end);
    if (!inter) return;

    const v1 = this.getOutwardVector(inter, line1);
    const v2 = this.getOutwardVector(inter, line2);

    const t1: Point2D = { x: inter.x + v1.x * this.dist, y: inter.y + v1.y * this.dist };
    const t2: Point2D = { x: inter.x + v2.x * this.dist, y: inter.y + v2.y * this.dist };

    const updatedLine1 = JSON.parse(JSON.stringify(line1));
    if (Math.hypot(line1.start.x - inter.x, line1.start.y - inter.y) < Math.hypot(line1.end.x - inter.x, line1.end.y - inter.y)) {
      updatedLine1.start = t1;
    } else {
      updatedLine1.end = t1;
    }

    const updatedLine2 = JSON.parse(JSON.stringify(line2));
    if (Math.hypot(line2.start.x - inter.x, line2.start.y - inter.y) < Math.hypot(line2.end.x - inter.x, line2.end.y - inter.y)) {
      updatedLine2.start = t2;
    } else {
      updatedLine2.end = t2;
    }

    const bevelLine: LineEntity = {
      id: `chamfer_line_${Date.now()}`,
      type: 'line',
      layerId: line1.layerId,
      start: t1,
      end: t2,
      visible: true,
    };

    const batch = new CompositeCommand(
      [
        new ModifyEntityCommand(this.core, line1, updatedLine1),
        new ModifyEntityCommand(this.core, line2, updatedLine2),
        new AddEntityCommand(this.core, bevelLine),
      ],
      `CHAMFER (D=${this.dist})`
    );
    this.core.executeCommand(batch);
    this.core.logCommandMessage(`CHAMFER created with distance ${this.dist}.`);
  }

  private getOutwardVector(corner: Point2D, line: LineEntity): Point2D {
    const dStart = Math.hypot(line.start.x - corner.x, line.start.y - corner.y);
    const dEnd = Math.hypot(line.end.x - corner.x, line.end.y - corner.y);
    const farPt = dStart > dEnd ? line.start : line.end;
    const dx = farPt.x - corner.x;
    const dy = farPt.y - corner.y;
    const len = Math.hypot(dx, dy);
    return { x: dx / len, y: dy / len };
  }
}

export class FilletChamferPlugin implements CADPlugin {
  public id = 'modify-fillet-chamfer';
  public name = 'Fillet and Chamfer Tools';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new FilletTool());
    core.registerTool(new ChamferTool());
  }

  public destroy(): void {}
}
