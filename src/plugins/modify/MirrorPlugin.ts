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
import { IntersectionUtils } from '../../core/geometry/IntersectionUtils';

export class MirrorTool implements CADTool {
  public id = 'mirror';
  public name = 'Mirror';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'MI';

  private core: CADCoreAPI | null = null;
  private selectedEntities: CADEntity[] = [];
  private axisStart: Point2D | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntities = core.getSelectedEntities();
    this.axisStart = null;

    if (this.selectedEntities.length === 0) {
      core.setPrompt('MIRROR Select objects first, or click object to mirror:');
    } else {
      core.setPrompt(`MIRROR ${this.selectedEntities.length} object(s) selected. Specify first point of mirror line:`);
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
        this.core.setPrompt('MIRROR Specify first point of mirror line:');
      }
      return;
    }

    if (!this.axisStart) {
      this.axisStart = { ...e.world };
      this.core.setPrompt('MIRROR Specify second point of mirror line:');
    } else {
      const axisEnd = { ...e.world };
      const dist = Math.hypot(axisEnd.x - this.axisStart.x, axisEnd.y - this.axisStart.y);
      if (dist < 1e-4) return;

      const mirroredEntities = this.selectedEntities.map((ent) => {
        const mirrored = this.mirrorEntity(ent, this.axisStart!, axisEnd);
        mirrored.id = `${ent.type}_mirrored_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        return mirrored;
      });

      const cmds = mirroredEntities.map((m) => new AddEntityCommand(this.core!, m));
      const batch = new CompositeCommand(cmds, `MIRROR ${mirroredEntities.length} object(s)`);
      this.core.executeCommand(batch);
      this.core.logCommandMessage(`MIRROR: ${mirroredEntities.length} object(s) mirrored.`);

      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.axisStart || this.selectedEntities.length === 0) return;

    const axisEnd = e.world;
    if (Math.hypot(axisEnd.x - this.axisStart.x, axisEnd.y - this.axisStart.y) < 1e-4) return;

    // Show preview of first mirrored object
    const preview = this.mirrorEntity(this.selectedEntities[0], this.axisStart, axisEnd);
    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.axisStart = null;
    this.selectedEntities = [];
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private mirrorEntity(ent: CADEntity, p1: Point2D, p2: Point2D): CADEntity {
    const copy = JSON.parse(JSON.stringify(ent));
    const reflect = (pt: Point2D) => IntersectionUtils.reflectPointAcrossLine(pt, p1, p2);

    if (copy.type === 'line') {
      copy.start = reflect(copy.start);
      copy.end = reflect(copy.end);
    } else if (copy.type === 'circle') {
      copy.center = reflect(copy.center);
    } else if (copy.type === 'rectangle') {
      const orig = copy.origin;
      const corners = [
        reflect(orig),
        reflect({ x: orig.x + copy.width, y: orig.y }),
        reflect({ x: orig.x + copy.width, y: orig.y + copy.height }),
        reflect({ x: orig.x, y: orig.y + copy.height }),
      ];
      return {
        id: copy.id,
        type: 'polyline',
        layerId: copy.layerId,
        color: copy.color,
        points: corners,
        closed: true,
        visible: true,
      };
    } else if (copy.type === 'polyline') {
      copy.points = copy.points.map((pt: any) => ({
        ...reflect(pt),
        bulge: pt.bulge ? -pt.bulge : undefined, // Invert bulge orientation on mirror
      }));
    } else if (copy.type === 'arc') {
      const oldCenter = copy.center;
      copy.center = reflect(oldCenter);
      const sPt = reflect({
        x: oldCenter.x + copy.radius * Math.cos(copy.startAngle),
        y: oldCenter.y + copy.radius * Math.sin(copy.startAngle),
      });
      const ePt = reflect({
        x: oldCenter.x + copy.radius * Math.cos(copy.endAngle),
        y: oldCenter.y + copy.radius * Math.sin(copy.endAngle),
      });
      copy.startAngle = Math.atan2(ePt.y - copy.center.y, ePt.x - copy.center.x);
      copy.endAngle = Math.atan2(sPt.y - copy.center.y, sPt.x - copy.center.x);
    } else if (copy.type === 'spline') {
      copy.controlPoints = copy.controlPoints.map(reflect);
    } else if (copy.type === 'ellipse') {
      copy.center = reflect(copy.center);
      // Mirror rotation angle across mirror line
      const axisAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      copy.rotation = 2 * axisAngle - (copy.rotation || 0);
    } else if (copy.type === 'hatch') {
      copy.boundary = copy.boundary.map(reflect);
    } else if (copy.type === 'text') {
      copy.position = reflect(copy.position);
    }

    return copy;
  }
}

export class MirrorPlugin implements CADPlugin {
  public id = 'modify-mirror';
  public name = 'Mirror Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new MirrorTool());
  }

  public destroy(): void {}
}
