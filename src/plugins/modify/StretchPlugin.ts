import {
  BoundingBox2D,
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { TransformEntityCommand } from '../../commands/TransformEntityCommand';

export class StretchTool implements CADTool {
  public id = 'stretch';
  public name = 'Stretch';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'S';

  private core: CADCoreAPI | null = null;
  private step: 'select_window_start' | 'select_window_end' | 'base_point' | 'second_point' = 'select_window_start';
  private windowStart: Point2D | null = null;
  private crossingBox: BoundingBox2D | null = null;
  private stretchEntities: CADEntity[] = [];
  private basePoint: Point2D | null = null;

  public getBasePoint(): Point2D | null {
    return this.basePoint ? { ...this.basePoint } : null;
  }

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.step = 'select_window_start';
    this.windowStart = null;
    this.crossingBox = null;
    this.stretchEntities = [];
    this.basePoint = null;
    this.core.setPrompt('STRETCH Specify first corner of crossing window:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (this.step === 'select_window_start') {
      this.windowStart = { ...e.world };
      this.step = 'select_window_end';
      this.core.setSelectionBox({
        start: this.windowStart,
        current: this.windowStart,
        isCrossing: true,
      });
      this.core.setPrompt('STRETCH Specify opposite corner of crossing window:');
    } else if (this.step === 'select_window_end') {
      if (!this.windowStart) return;
      this.crossingBox = {
        minX: Math.min(this.windowStart.x, e.world.x),
        maxX: Math.max(this.windowStart.x, e.world.x),
        minY: Math.min(this.windowStart.y, e.world.y),
        maxY: Math.max(this.windowStart.y, e.world.y),
      };
      this.core.setSelectionBox(null);

      // Collect entities overlapping with crossing box
      const selectionMgr = (this.core as any).getSelectionManager();
      const matchedIds = selectionMgr.selectByBox(this.core.getEntities(), this.crossingBox, true, false);
      const entityMap = new Map(this.core.getEntities().map((ent) => [ent.id, ent]));
      this.stretchEntities = matchedIds.map((id: string) => entityMap.get(id)).filter((ent: any): ent is CADEntity => !!ent);

      if (this.stretchEntities.length === 0) {
        this.core.logCommandMessage('No objects found in crossing window.');
        this.cancel();
        return;
      }

      this.step = 'base_point';
      this.core.setPrompt(`STRETCH ${this.stretchEntities.length} object(s) selected. Specify base point:`);
    } else if (this.step === 'base_point') {
      this.basePoint = { ...e.world };
      this.step = 'second_point';
      this.core.setPrompt('STRETCH Specify second point:');
    } else if (this.step === 'second_point') {
      if (!this.basePoint || !this.crossingBox) return;

      const dx = e.world.x - this.basePoint.x;
      const dy = e.world.y - this.basePoint.y;

      const after = this.stretchEntities.map((ent) => this.stretchEntity(ent, this.crossingBox!, dx, dy));
      const cmd = new TransformEntityCommand(this.core, this.stretchEntities, after, 'STRETCH');
      this.core.executeCommand(cmd);
      this.core.logCommandMessage(`STRETCH: Stretched ${this.stretchEntities.length} object(s).`);

      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core) return;

    if (this.step === 'select_window_end' && this.windowStart) {
      this.core.setSelectionBox({
        start: this.windowStart,
        current: e.world,
        isCrossing: true,
      });
    } else if (this.step === 'second_point' && this.basePoint && this.crossingBox) {
      const dx = e.world.x - this.basePoint.x;
      const dy = e.world.y - this.basePoint.y;

      // Show preview of stretched entities
      const preview = this.stretchEntity(this.stretchEntities[0], this.crossingBox, dx, dy);
      this.core.setPreviewEntity(preview);
    }
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.step = 'select_window_start';
    this.windowStart = null;
    this.crossingBox = null;
    this.stretchEntities = [];
    this.basePoint = null;
    if (this.core) {
      this.core.setSelectionBox(null);
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private stretchEntity(ent: CADEntity, box: BoundingBox2D, dx: number, dy: number): CADEntity {
    const copy = JSON.parse(JSON.stringify(ent));
    const isInside = (pt: Point2D) =>
      pt.x >= box.minX && pt.x <= box.maxX && pt.y >= box.minY && pt.y <= box.maxY;

    if (copy.type === 'line') {
      if (isInside(copy.start)) {
        copy.start.x += dx;
        copy.start.y += dy;
      }
      if (isInside(copy.end)) {
        copy.end.x += dx;
        copy.end.y += dy;
      }
    } else if (copy.type === 'rectangle') {
      const p1 = copy.origin;
      const p2 = { x: copy.origin.x + copy.width, y: copy.origin.y };
      const p3 = { x: copy.origin.x + copy.width, y: copy.origin.y + copy.height };
      const p4 = { x: copy.origin.x, y: copy.origin.y + copy.height };

      const in1 = isInside(p1);
      const in2 = isInside(p2);
      const in3 = isInside(p3);
      const in4 = isInside(p4);

      if (in1 && in2 && in3 && in4) {
        copy.origin.x += dx;
        copy.origin.y += dy;
      } else {
        // Convert to stretched polyline
        const pts = [
          in1 ? { x: p1.x + dx, y: p1.y + dy } : p1,
          in2 ? { x: p2.x + dx, y: p2.y + dy } : p2,
          in3 ? { x: p3.x + dx, y: p3.y + dy } : p3,
          in4 ? { x: p4.x + dx, y: p4.y + dy } : p4,
        ];
        return {
          id: copy.id,
          type: 'polyline',
          layerId: copy.layerId,
          color: copy.color,
          points: pts,
          closed: true,
          visible: true,
        };
      }
    } else if (copy.type === 'polyline') {
      copy.points = copy.points.map((pt: any) => {
        if (isInside(pt)) {
          return { ...pt, x: pt.x + dx, y: pt.y + dy };
        }
        return pt;
      });
    } else if (copy.type === 'spline') {
      copy.controlPoints = copy.controlPoints.map((pt: Point2D) => {
        if (isInside(pt)) {
          return { x: pt.x + dx, y: pt.y + dy };
        }
        return pt;
      });
    } else if (copy.type === 'hatch') {
      copy.boundary = copy.boundary.map((pt: Point2D) => {
        if (isInside(pt)) {
          return { x: pt.x + dx, y: pt.y + dy };
        }
        return pt;
      });
    }

    return copy;
  }
}

export class StretchPlugin implements CADPlugin {
  public id = 'modify-stretch';
  public name = 'Stretch Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new StretchTool());
  }

  public destroy(): void {}
}
