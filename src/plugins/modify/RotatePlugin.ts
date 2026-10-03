import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { TransformEntityCommand } from '../../commands/TransformEntityCommand';

export class RotateTool implements CADTool {
  public id = 'rotate';
  public name = 'Rotate';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'RO';

  private core: CADCoreAPI | null = null;
  private selectedEntities: CADEntity[] = [];
  private basePoint: Point2D | null = null;

  public getBasePoint(): Point2D | null {
    return this.basePoint ? { ...this.basePoint } : null;
  }

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntities = core.getSelectedEntities();
    this.basePoint = null;

    if (this.selectedEntities.length === 0) {
      core.setPrompt('ROTATE Select objects first:');
    } else {
      core.setPrompt(`ROTATE ${this.selectedEntities.length} object(s) selected. Specify base point:`);
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
        this.core.setPrompt('ROTATE Specify base point:');
      }
      return;
    }

    if (!this.basePoint) {
      this.basePoint = { ...e.world };
      this.core.setPrompt('ROTATE Specify rotation angle:');
    } else {
      const angle = Math.atan2(e.world.y - this.basePoint.y, e.world.x - this.basePoint.x);
      const after = this.selectedEntities.map((ent) => this.rotateEntity(ent, this.basePoint!, angle));

      const cmd = new TransformEntityCommand(this.core, this.selectedEntities, after, 'ROTATE');
      this.core.executeCommand(cmd);

      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.basePoint || this.selectedEntities.length === 0) return;

    const angle = Math.atan2(e.world.y - this.basePoint.y, e.world.x - this.basePoint.x);
    const degrees = ((angle * 180) / Math.PI + 360) % 360;
    this.core.setPrompt(`ROTATE Angle: ${degrees.toFixed(1)}°`);

    const preview = this.rotateEntity(this.selectedEntities[0], this.basePoint, angle);
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.basePoint = null;
    this.selectedEntities = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
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
      // Rotate as polyline rectangle representation for accuracy
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
      copy.points = copy.points.map(rot);
    } else if (copy.type === 'arc') {
      copy.center = rot(copy.center);
      copy.startAngle += angle;
      copy.endAngle += angle;
    } else if (copy.type === 'text') {
      copy.position = rot(copy.position);
      copy.rotation = (copy.rotation || 0) + angle;
    }

    return copy;
  }
}

export class RotatePlugin implements CADPlugin {
  public id = 'modify-rotate';
  public name = 'Rotate Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new RotateTool());
  }

  public destroy(): void {}
}
