import { CADEntity, Point2D, BoundingBox2D } from './types';
import { RTree2D } from './spatial/RTree';
import { SplineUtils } from './geometry/SplineUtils';
import { EllipseUtils } from './geometry/EllipseUtils';
import { BulgeUtils } from './geometry/BulgeUtils';
import { PolygonBooleanUtils } from './geometry/PolygonBooleanUtils';

export class SelectionManager {
  private selectedIds: Set<string> = new Set();
  private rTree: RTree2D = new RTree2D();
  private onChangeCallback?: () => void;

  constructor(onChange?: () => void) {
    this.onChangeCallback = onChange;
  }

  public setOnChange(cb: () => void): void {
    this.onChangeCallback = cb;
  }

  public getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  public select(ids: string[], append = false): void {
    if (!append) {
      this.selectedIds.clear();
    }
    for (const id of ids) {
      this.selectedIds.add(id);
    }
    this.onChangeCallback?.();
  }

  public deselect(ids: string[]): void {
    for (const id of ids) {
      this.selectedIds.delete(id);
    }
    this.onChangeCallback?.();
  }

  public toggle(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.onChangeCallback?.();
  }

  public clear(): void {
    if (this.selectedIds.size > 0) {
      this.selectedIds.clear();
      this.onChangeCallback?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Spatial Index Management
  // ---------------------------------------------------------------------------
  public indexEntity(ent: CADEntity): void {
    const bounds = this.getEntityBounds(ent);
    if (bounds) {
      this.rTree.insert(ent.id, bounds);
    }
  }

  public unindexEntity(id: string): void {
    this.rTree.remove(id);
  }

  public rebuildIndex(entities: CADEntity[]): void {
    this.rTree.clear();
    for (const ent of entities) {
      if (ent.visible !== false) {
        this.indexEntity(ent);
      }
    }
  }

  public getSpatialIndex(): RTree2D {
    return this.rTree;
  }

  // ---------------------------------------------------------------------------
  // Picking & Box Selection with R-Tree acceleration
  // ---------------------------------------------------------------------------
  public pickEntity(entities: CADEntity[], worldPt: Point2D, toleranceWorld: number): CADEntity | null {
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    // 1. Spatial pre-filter via R-Tree in O(log N)
    const candidateIds = this.rTree.searchPoint(worldPt, toleranceWorld);

    // If R-Tree has candidates, test only those
    const toTest = candidateIds.length > 0
      ? candidateIds.map((id) => entityMap.get(id)).filter((e): e is CADEntity => !!e)
      : entities;

    // Search in reverse order (topmost first)
    for (let i = toTest.length - 1; i >= 0; i--) {
      const ent = toTest[i];
      if (ent.visible === false) continue;
      if (this.isPointNearEntity(ent, worldPt, toleranceWorld)) {
        return ent;
      }
    }
    return null;
  }

  public selectByBox(
    entities: CADEntity[],
    box: BoundingBox2D,
    isCrossing: boolean,
    append = false
  ): string[] {
    const entityMap = new Map(entities.map((e) => [e.id, e]));

    // 1. Pre-filter candidate IDs via R-Tree search
    const candidateIds = this.rTree.search(box);
    const toTest = candidateIds.length > 0
      ? candidateIds.map((id) => entityMap.get(id)).filter((e): e is CADEntity => !!e)
      : entities;

    const matched: string[] = [];

    for (const ent of toTest) {
      if (ent.visible === false) continue;
      const bounds = this.getEntityBounds(ent);
      if (!bounds) continue;

      if (isCrossing) {
        // Crossing: overlaps bounding box
        if (
          bounds.minX <= box.maxX &&
          bounds.maxX >= box.minX &&
          bounds.minY <= box.maxY &&
          bounds.maxY >= box.minY
        ) {
          matched.push(ent.id);
        }
      } else {
        // Window: fully contained
        if (
          bounds.minX >= box.minX &&
          bounds.maxX <= box.maxX &&
          bounds.minY >= box.minY &&
          bounds.maxY <= box.maxY
        ) {
          matched.push(ent.id);
        }
      }
    }

    this.select(matched, append);
    return matched;
  }

  // ---------------------------------------------------------------------------
  // Bounding Box Calculation for all Entity Types
  // ---------------------------------------------------------------------------
  public getEntityBounds(ent: CADEntity): BoundingBox2D | null {
    if (ent.type === 'line') {
      const line = ent as any;
      return {
        minX: Math.min(line.start.x, line.end.x),
        maxX: Math.max(line.start.x, line.end.x),
        minY: Math.min(line.start.y, line.end.y),
        maxY: Math.max(line.start.y, line.end.y),
      };
    } else if (ent.type === 'circle') {
      const c = ent as any;
      return {
        minX: c.center.x - c.radius,
        maxX: c.center.x + c.radius,
        minY: c.center.y - c.radius,
        maxY: c.center.y + c.radius,
      };
    } else if (ent.type === 'rectangle') {
      const r = ent as any;
      return {
        minX: Math.min(r.origin.x, r.origin.x + r.width),
        maxX: Math.max(r.origin.x, r.origin.x + r.width),
        minY: Math.min(r.origin.y, r.origin.y + r.height),
        maxY: Math.max(r.origin.y, r.origin.y + r.height),
      };
    } else if (ent.type === 'polyline') {
      const poly = ent as any;
      const pts = poly.points || [];
      if (pts.length === 0) return null;

      let minX = pts[0].x, maxX = pts[0].x;
      let minY = pts[0].y, maxY = pts[0].y;

      for (let i = 0; i < pts.length; i++) {
        const curr = pts[i];
        minX = Math.min(minX, curr.x);
        maxX = Math.max(maxX, curr.x);
        minY = Math.min(minY, curr.y);
        maxY = Math.max(maxY, curr.y);

        // Account for bulged arc segments
        if (curr.bulge && i < pts.length - 1) {
          const arc = BulgeUtils.toArc(curr, pts[i + 1], curr.bulge);
          if (arc) {
            minX = Math.min(minX, arc.center.x - arc.radius);
            maxX = Math.max(maxX, arc.center.x + arc.radius);
            minY = Math.min(minY, arc.center.y - arc.radius);
            maxY = Math.max(maxY, arc.center.y + arc.radius);
          }
        }
      }
      return { minX, maxX, minY, maxY };
    } else if (ent.type === 'arc') {
      const arc = ent as any;
      return {
        minX: arc.center.x - arc.radius,
        maxX: arc.center.x + arc.radius,
        minY: arc.center.y - arc.radius,
        maxY: arc.center.y + arc.radius,
      };
    } else if (ent.type === 'text') {
      const t = ent as any;
      const approxWidth = (t.text || '').length * (t.fontSize || 12) * 0.6;
      const approxHeight = t.fontSize || 12;
      return {
        minX: t.position.x,
        maxX: t.position.x + approxWidth,
        minY: t.position.y - approxHeight,
        maxY: t.position.y,
      };
    } else if (ent.type === 'spline') {
      const spl = ent as any;
      return SplineUtils.getBounds(spl.controlPoints || [], spl.closed);
    } else if (ent.type === 'ellipse') {
      const el = ent as any;
      return EllipseUtils.getBounds(el.center, el.radiusX, el.radiusY, el.rotation || 0);
    } else if (ent.type === 'hatch') {
      const h = ent as any;
      return PolygonBooleanUtils.getBounds(h.boundary || []);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Hit Testing for all Entity Types
  // ---------------------------------------------------------------------------
  public isPointNearEntity(ent: CADEntity, pt: Point2D, tol: number): boolean {
    if (ent.type === 'line') {
      const line = ent as any;
      return this.distancePointToSegment(pt, line.start, line.end) <= tol;
    } else if (ent.type === 'circle') {
      const c = ent as any;
      const dist = Math.hypot(pt.x - c.center.x, pt.y - c.center.y);
      return Math.abs(dist - c.radius) <= tol;
    } else if (ent.type === 'rectangle') {
      const r = ent as any;
      const p1 = r.origin;
      const p2 = { x: r.origin.x + r.width, y: r.origin.y };
      const p3 = { x: r.origin.x + r.width, y: r.origin.y + r.height };
      const p4 = { x: r.origin.x, y: r.origin.y + r.height };
      return (
        this.distancePointToSegment(pt, p1, p2) <= tol ||
        this.distancePointToSegment(pt, p2, p3) <= tol ||
        this.distancePointToSegment(pt, p3, p4) <= tol ||
        this.distancePointToSegment(pt, p4, p1) <= tol
      );
    } else if (ent.type === 'polyline') {
      const poly = ent as any;
      const pts = poly.points || [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        if (p1.bulge) {
          const sampled = BulgeUtils.samplePoints(p1, p2, p1.bulge, 12);
          for (let k = 0; k < sampled.length - 1; k++) {
            if (this.distancePointToSegment(pt, sampled[k], sampled[k + 1]) <= tol) return true;
          }
        } else {
          if (this.distancePointToSegment(pt, p1, p2) <= tol) return true;
        }
      }
      if (poly.closed && pts.length > 2) {
        const last = pts[pts.length - 1];
        const first = pts[0];
        if (last.bulge) {
          const sampled = BulgeUtils.samplePoints(last, first, last.bulge, 12);
          for (let k = 0; k < sampled.length - 1; k++) {
            if (this.distancePointToSegment(pt, sampled[k], sampled[k + 1]) <= tol) return true;
          }
        } else {
          if (this.distancePointToSegment(pt, last, first) <= tol) return true;
        }
      }
      return false;
    } else if (ent.type === 'arc') {
      const arc = ent as any;
      const dist = Math.hypot(pt.x - arc.center.x, pt.y - arc.center.y);
      if (Math.abs(dist - arc.radius) > tol) return false;
      let angle = Math.atan2(pt.y - arc.center.y, pt.x - arc.center.x);
      if (angle < 0) angle += Math.PI * 2;
      let s = arc.startAngle;
      let e = arc.endAngle;
      if (s < 0) s += Math.PI * 2;
      if (e < 0) e += Math.PI * 2;
      if (s <= e) {
        return angle >= s && angle <= e;
      } else {
        return angle >= s || angle <= e;
      }
    } else if (ent.type === 'spline') {
      const spl = ent as any;
      return SplineUtils.distanceToSpline(pt, spl.controlPoints || [], spl.closed) <= tol;
    } else if (ent.type === 'ellipse') {
      const el = ent as any;
      return EllipseUtils.distanceToEllipse(pt, el.center, el.radiusX, el.radiusY, el.rotation || 0) <= tol;
    } else if (ent.type === 'hatch') {
      const h = ent as any;
      const poly = h.boundary || [];
      // Clicking inside the polygon or clicking its boundary selects the hatch!
      if (PolygonBooleanUtils.isPointInPolygon(pt, poly)) return true;
      for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        if (this.distancePointToSegment(pt, p1, p2) <= tol) return true;
      }
      return false;
    } else if (ent.type === 'text') {
      const bounds = this.getEntityBounds(ent);
      if (!bounds) return false;
      return (
        pt.x >= bounds.minX - tol &&
        pt.x <= bounds.maxX + tol &&
        pt.y >= bounds.minY - tol &&
        pt.y <= bounds.maxY + tol
      );
    }
    return false;
  }

  private distancePointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return Math.hypot(apx, apy);
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * abx;
    const projY = a.y + t * aby;
    return Math.hypot(p.x - projX, p.y - projY);
  }
}
