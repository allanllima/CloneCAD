import { CADEntity, Point2D, BoundingBox2D } from './types';

export class SelectionManager {
  private selectedIds: Set<string> = new Set();
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

  /**
   * Find entity under point with tolerance (in world coordinates)
   */
  public pickEntity(entities: CADEntity[], worldPt: Point2D, toleranceWorld: number): CADEntity | null {
    // Search in reverse order (topmost first)
    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i];
      if (ent.visible === false) continue;
      if (this.isPointNearEntity(ent, worldPt, toleranceWorld)) {
        return ent;
      }
    }
    return null;
  }

  /**
   * Select entities within window (window vs crossing)
   * isCrossing = true (Green, Right-to-Left): selects any entity touching or inside
   * isCrossing = false (Blue, Left-to-Right): selects only entities entirely inside
   */
  public selectByBox(
    entities: CADEntity[],
    box: BoundingBox2D,
    isCrossing: boolean,
    append = false
  ): string[] {
    const matched: string[] = [];

    for (const ent of entities) {
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
      const pts: Point2D[] = poly.points || [];
      if (pts.length === 0) return null;
      let minX = pts[0].x, maxX = pts[0].x;
      let minY = pts[0].y, maxY = pts[0].y;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
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
    }
    return null;
  }

  private isPointNearEntity(ent: CADEntity, pt: Point2D, tol: number): boolean {
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
      const pts: Point2D[] = poly.points || [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (this.distancePointToSegment(pt, pts[i], pts[i + 1]) <= tol) return true;
      }
      if (poly.closed && pts.length > 2) {
        if (this.distancePointToSegment(pt, pts[pts.length - 1], pts[0]) <= tol) return true;
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
