import {
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  LineEntity,
  Point2D,
} from '../../core/types';
import { ModifyEntityCommand } from '../../commands/ModifyEntityCommand';
import { DeleteEntityCommand } from '../../commands/DeleteEntityCommand';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';
import { IntersectionUtils } from '../../core/geometry/IntersectionUtils';

export class TrimTool implements CADTool {
  public id = 'trim';
  public name = 'Trim';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'TR';

  private core: CADCoreAPI | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.core.setPrompt('TRIM Select segment to trim:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (clicked && clicked.type === 'line') {
      this.trimLine(clicked as LineEntity, e.world);
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private trimLine(line: LineEntity, clickPt: Point2D): void {
    if (!this.core) return;

    const allEntities = this.core.getEntities().filter((ent) => ent.id !== line.id && ent.visible !== false);
    const intersections: { pt: Point2D; t: number }[] = [];

    const dx = line.end.x - line.start.x;
    const dy = line.end.y - line.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-6) return;

    // Find all intersections with cutting edges
    for (const ent of allEntities) {
      if (ent.type === 'line') {
        const other = ent as LineEntity;
        const inter = IntersectionUtils.segmentSegmentIntersection(line.start, line.end, other.start, other.end);
        if (inter) {
          const t = ((inter.x - line.start.x) * dx + (inter.y - line.start.y) * dy) / lenSq;
          if (t > 1e-4 && t < 1 - 1e-4) {
            intersections.push({ pt: inter, t });
          }
        }
      } else if (ent.type === 'circle') {
        const circle = ent as any;
        const pts = IntersectionUtils.lineSegmentCircleIntersections(line.start, line.end, circle.center, circle.radius);
        for (const pt of pts) {
          const t = ((pt.x - line.start.x) * dx + (pt.y - line.start.y) * dy) / lenSq;
          if (t > 1e-4 && t < 1 - 1e-4) {
            intersections.push({ pt, t });
          }
        }
      }
    }

    if (intersections.length === 0) {
      this.core.logCommandMessage('No cutting edge found for this segment.');
      return;
    }

    // Sort intersections by t along line
    intersections.sort((a, b) => a.t - b.t);

    // Clicked parameter t
    const clickT = ((clickPt.x - line.start.x) * dx + (clickPt.y - line.start.y) * dy) / lenSq;

    // Case 1: Clicked before the first intersection
    if (clickT < intersections[0].t) {
      const updated = JSON.parse(JSON.stringify(line));
      updated.start = intersections[0].pt;
      this.core.executeCommand(new ModifyEntityCommand(this.core, line, updated, 'TRIM'));
      this.core.logCommandMessage('TRIM: Trimmed end segment.');
      return;
    }

    // Case 2: Clicked after the last intersection
    const last = intersections[intersections.length - 1];
    if (clickT > last.t) {
      const updated = JSON.parse(JSON.stringify(line));
      updated.end = last.pt;
      this.core.executeCommand(new ModifyEntityCommand(this.core, line, updated, 'TRIM'));
      this.core.logCommandMessage('TRIM: Trimmed end segment.');
      return;
    }

    // Case 3: Clicked between two intersections (middle section)
    for (let i = 0; i < intersections.length - 1; i++) {
      const left = intersections[i];
      const right = intersections[i + 1];

      if (clickT >= left.t && clickT <= right.t) {
        // Line splits into [start, left.pt] and [right.pt, end]
        const updated1: LineEntity = {
          ...line,
          end: left.pt,
        };
        const newLine2: LineEntity = {
          id: `line_trim_${Date.now()}`,
          type: 'line',
          layerId: line.layerId,
          start: right.pt,
          end: line.end,
          visible: true,
        };

        const batch = new CompositeCommand(
          [
            new ModifyEntityCommand(this.core, line, updated1),
            new AddEntityCommand(this.core, newLine2),
          ],
          'TRIM (middle segment)'
        );
        this.core.executeCommand(batch);
        this.core.logCommandMessage('TRIM: Cut internal segment between cutting edges.');
        return;
      }
    }
  }
}

export class ExtendTool implements CADTool {
  public id = 'extend';
  public name = 'Extend';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'EX';

  private core: CADCoreAPI | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.core.setPrompt('EXTEND Select line near the end to extend:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (clicked && clicked.type === 'line') {
      this.extendLine(clicked as LineEntity, e.world);
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  private extendLine(line: LineEntity, clickPt: Point2D): void {
    if (!this.core) return;

    const dStart = Math.hypot(clickPt.x - line.start.x, clickPt.y - line.start.y);
    const dEnd = Math.hypot(clickPt.x - line.end.x, clickPt.y - line.end.y);

    const isExtendingEnd = dEnd < dStart;
    const rayOrigin = isExtendingEnd ? line.end : line.start;
    const dx = isExtendingEnd ? line.end.x - line.start.x : line.start.x - line.end.x;
    const dy = isExtendingEnd ? line.end.y - line.start.y : line.start.y - line.end.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) return;

    const dirX = dx / len;
    const dirY = dy / len;

    // Ray extends up to 10,000 units forward
    const rayFar: Point2D = {
      x: rayOrigin.x + dirX * 10000,
      y: rayOrigin.y + dirY * 10000,
    };

    let closestHit: Point2D | null = null;
    let minHitDist = Infinity;

    const allEntities = this.core.getEntities().filter((ent) => ent.id !== line.id && ent.visible !== false);
    for (const ent of allEntities) {
      if (ent.type === 'line') {
        const other = ent as LineEntity;
        const inter = IntersectionUtils.segmentSegmentIntersection(rayOrigin, rayFar, other.start, other.end);
        if (inter) {
          const hitDist = Math.hypot(inter.x - rayOrigin.x, inter.y - rayOrigin.y);
          if (hitDist > 1e-3 && hitDist < minHitDist) {
            minHitDist = hitDist;
            closestHit = inter;
          }
        }
      }
    }

    if (closestHit) {
      const updated = JSON.parse(JSON.stringify(line));
      if (isExtendingEnd) {
        updated.end = closestHit;
      } else {
        updated.start = closestHit;
      }
      this.core.executeCommand(new ModifyEntityCommand(this.core, line, updated, 'EXTEND'));
      this.core.logCommandMessage(`EXTEND: Extended line to boundary edge.`);
    } else {
      this.core.logCommandMessage('No boundary edge found to extend to.');
    }
  }
}

export class TrimExtendPlugin implements CADPlugin {
  public id = 'modify-trim-extend';
  public name = 'Trim and Extend Tools';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new TrimTool());
    core.registerTool(new ExtendTool());
  }

  public destroy(): void {}
}
