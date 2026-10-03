import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';

export class ArrayTool implements CADTool {
  public id = 'array';
  public name = 'Array';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'AR';

  private core: CADCoreAPI | null = null;
  private selectedEntities: CADEntity[] = [];

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntities = core.getSelectedEntities();

    if (this.selectedEntities.length === 0) {
      core.setPrompt('ARRAY Select objects first:');
    } else {
      this.promptArrayOptions();
    }
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (this.selectedEntities.length === 0) {
      const selectionMgr = (this.core as any).getSelectionManager();
      const tol = 8 / this.core.getViewport().zoom;
      const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);
      if (clicked) {
        this.selectedEntities = [clicked];
        this.core.selectEntities([clicked.id], false);
        this.promptArrayOptions();
      }
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.selectedEntities = [];
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private promptArrayOptions(): void {
    if (!this.core || this.selectedEntities.length === 0) return;

    const type = window.prompt('Enter array type [Rectangular / Polar] <R>:', 'R')?.toUpperCase();

    if (type === 'P' || type === 'POLAR') {
      this.createPolarArray();
    } else {
      this.createRectangularArray();
    }

    this.cancel();
  }

  private createRectangularArray(): void {
    if (!this.core) return;

    const rowsInput = parseInt(window.prompt('Enter number of rows <3>:', '3') || '3');
    const colsInput = parseInt(window.prompt('Enter number of columns <4>:', '4') || '4');
    const rowDist = parseFloat(window.prompt('Enter distance between rows <50>:', '50') || '50');
    const colDist = parseFloat(window.prompt('Enter distance between columns <60>:', '60') || '60');

    const rows = Math.max(1, Math.min(50, rowsInput));
    const cols = Math.max(1, Math.min(50, colsInput));

    const newEntities: CADEntity[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 && c === 0) continue; // Skip original
        const dx = c * colDist;
        const dy = r * rowDist;

        for (const ent of this.selectedEntities) {
          const clone = this.translateEntity(ent, dx, dy);
          clone.id = `${ent.type}_array_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
          newEntities.push(clone);
        }
      }
    }

    if (newEntities.length > 0) {
      const cmds = newEntities.map((ent) => new AddEntityCommand(this.core!, ent));
      const batch = new CompositeCommand(cmds, `ARRAY Rectangular (${rows}x${cols})`);
      this.core.executeCommand(batch);
      this.core.logCommandMessage(`ARRAY: Created ${newEntities.length} items (${rows} rows x ${cols} cols).`);
    }
  }

  private createPolarArray(): void {
    if (!this.core) return;

    const countInput = parseInt(window.prompt('Enter number of items in array <6>:', '6') || '6');
    const count = Math.max(2, Math.min(100, countInput));
    const fillAngleDeg = parseFloat(window.prompt('Enter angle to fill <360>:', '360') || '360');
    const fillAngleRad = (fillAngleDeg * Math.PI) / 180;

    // Use centroid of selection or first entity center as origin
    const origin = this.getSelectionCentroid();

    const newEntities: CADEntity[] = [];
    const step = fillAngleRad / count;

    for (let i = 1; i < count; i++) {
      const angle = i * step;
      for (const ent of this.selectedEntities) {
        const clone = this.rotateEntity(ent, origin, angle);
        clone.id = `${ent.type}_polar_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        newEntities.push(clone);
      }
    }

    if (newEntities.length > 0) {
      const cmds = newEntities.map((ent) => new AddEntityCommand(this.core!, ent));
      const batch = new CompositeCommand(cmds, `ARRAY Polar (${count} items)`);
      this.core.executeCommand(batch);
      this.core.logCommandMessage(`ARRAY: Created ${newEntities.length} items around center.`);
    }
  }

  private getSelectionCentroid(): Point2D {
    let sumX = 0, sumY = 0, total = 0;
    const selectionMgr = (this.core as any).getSelectionManager();

    for (const ent of this.selectedEntities) {
      const bounds = selectionMgr.getEntityBounds(ent);
      if (bounds) {
        sumX += (bounds.minX + bounds.maxX) / 2;
        sumY += (bounds.minY + bounds.maxY) / 2;
        total++;
      }
    }
    return total > 0 ? { x: sumX / total, y: sumY / total } : { x: 0, y: 0 };
  }

  private translateEntity(ent: CADEntity, dx: number, dy: number): CADEntity {
    const copy = JSON.parse(JSON.stringify(ent));
    if (copy.type === 'line') {
      copy.start.x += dx;
      copy.start.y += dy;
      copy.end.x += dx;
      copy.end.y += dy;
    } else if (copy.type === 'circle' || copy.type === 'arc' || copy.type === 'ellipse') {
      copy.center.x += dx;
      copy.center.y += dy;
    } else if (copy.type === 'rectangle') {
      copy.origin.x += dx;
      copy.origin.y += dy;
    } else if (copy.type === 'polyline') {
      copy.points = copy.points.map((p: any) => ({ ...p, x: p.x + dx, y: p.y + dy }));
    } else if (copy.type === 'spline') {
      copy.controlPoints = copy.controlPoints.map((p: Point2D) => ({ x: p.x + dx, y: p.y + dy }));
    } else if (copy.type === 'hatch') {
      copy.boundary = copy.boundary.map((p: Point2D) => ({ x: p.x + dx, y: p.y + dy }));
    } else if (copy.type === 'text') {
      copy.position.x += dx;
      copy.position.y += dy;
    }
    return copy;
  }

  private rotateEntity(ent: CADEntity, origin: Point2D, angle: number): CADEntity {
    const copy = JSON.parse(JSON.stringify(ent));
    const rot = (p: Point2D): Point2D => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      return {
        x: origin.x + (dx * cos - dy * sin),
        y: origin.y + (dx * sin + dy * cos),
      };
    };

    if (copy.type === 'line') {
      copy.start = rot(copy.start);
      copy.end = rot(copy.end);
    } else if (copy.type === 'circle') {
      copy.center = rot(copy.center);
    } else if (copy.type === 'rectangle') {
      const p1 = copy.origin;
      const p2 = { x: copy.origin.x + copy.width, y: copy.origin.y };
      const p3 = { x: copy.origin.x + copy.width, y: copy.origin.y + copy.height };
      const p4 = { x: copy.origin.x, y: copy.origin.y + copy.height };
      return {
        id: copy.id,
        type: 'polyline',
        layerId: copy.layerId,
        color: copy.color,
        points: [rot(p1), rot(p2), rot(p3), rot(p4)],
        closed: true,
        visible: true,
      };
    } else if (copy.type === 'polyline') {
      copy.points = copy.points.map((p: any) => ({ ...p, ...rot(p) }));
    } else if (copy.type === 'arc') {
      copy.center = rot(copy.center);
      copy.startAngle += angle;
      copy.endAngle += angle;
    } else if (copy.type === 'spline') {
      copy.controlPoints = copy.controlPoints.map(rot);
    } else if (copy.type === 'ellipse') {
      copy.center = rot(copy.center);
      copy.rotation = (copy.rotation || 0) + angle;
    } else if (copy.type === 'hatch') {
      copy.boundary = copy.boundary.map(rot);
    } else if (copy.type === 'text') {
      copy.position = rot(copy.position);
      copy.rotation = (copy.rotation || 0) + angle;
    }
    return copy;
  }
}

export class ArrayPlugin implements CADPlugin {
  public id = 'modify-array';
  public name = 'Array Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new ArrayTool());
  }

  public destroy(): void {}
}
