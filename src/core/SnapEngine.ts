import { CADEntity, Point2D, SnapResult, SnapSettings, SnapType } from './types';

export class SnapEngine {
  private settings: SnapSettings = {
    enabled: true,
    gridSnap: false,
    gridSize: 10,
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true,
    perpendicular: true,
    nearest: true,
    snapToleranceScreen: 14, // 14 pixels tolerance
  };

  public getSettings(): SnapSettings {
    return { ...this.settings };
  }

  public setSettings(updates: Partial<SnapSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * Find best snap candidate for mouse position
   */
  public findSnap(
    entities: CADEntity[],
    rawWorld: Point2D,
    worldToScreen: (world: Point2D) => Point2D,
    screenMouse: Point2D
  ): SnapResult | null {
    if (!this.settings.enabled) return null;

    let bestCandidate: SnapResult | null = null;
    let minDistanceSq = this.settings.snapToleranceScreen * this.settings.snapToleranceScreen;

    // Helper to evaluate a candidate point
    const evaluatePoint = (point: Point2D, type: SnapType, desc: string, entityId?: string) => {
      const screenPt = worldToScreen(point);
      const dx = screenPt.x - screenMouse.x;
      const dy = screenPt.y - screenMouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestCandidate = {
          point: { ...point },
          type,
          entityId,
          description: desc,
        };
      }
    };

    // 1. Grid Snap (if enabled and no entity snap found with higher priority)
    if (this.settings.gridSnap && this.settings.gridSize > 0) {
      const gs = this.settings.gridSize;
      const snappedGrid: Point2D = {
        x: Math.round(rawWorld.x / gs) * gs,
        y: Math.round(rawWorld.y / gs) * gs,
      };
      evaluatePoint(snappedGrid, 'grid', 'Grid');
    }

    // 2. Object Snaps (Endpoint, Midpoint, Center, Nearest)
    for (const ent of entities) {
      if (ent.visible === false) continue;

      if (ent.type === 'line') {
        const line = ent as any;
        if (this.settings.endpoint) {
          evaluatePoint(line.start, 'endpoint', 'Endpoint', line.id);
          evaluatePoint(line.end, 'endpoint', 'Endpoint', line.id);
        }
        if (this.settings.midpoint) {
          const mid = {
            x: (line.start.x + line.end.x) / 2,
            y: (line.start.y + line.end.y) / 2,
          };
          evaluatePoint(mid, 'midpoint', 'Midpoint', line.id);
        }
        if (this.settings.nearest) {
          const nearest = this.closestPointOnSegment(rawWorld, line.start, line.end);
          evaluatePoint(nearest, 'nearest', 'Nearest', line.id);
        }
      } else if (ent.type === 'circle') {
        const circle = ent as any;
        if (this.settings.center) {
          evaluatePoint(circle.center, 'center', 'Center', circle.id);
        }
        if (this.settings.endpoint) {
          // Quadrants
          evaluatePoint({ x: circle.center.x + circle.radius, y: circle.center.y }, 'endpoint', 'Quadrant', circle.id);
          evaluatePoint({ x: circle.center.x - circle.radius, y: circle.center.y }, 'endpoint', 'Quadrant', circle.id);
          evaluatePoint({ x: circle.center.x, y: circle.center.y + circle.radius }, 'endpoint', 'Quadrant', circle.id);
          evaluatePoint({ x: circle.center.x, y: circle.center.y - circle.radius }, 'endpoint', 'Quadrant', circle.id);
        }
        if (this.settings.nearest) {
          const dx = rawWorld.x - circle.center.x;
          const dy = rawWorld.y - circle.center.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.0001) {
            const nearest = {
              x: circle.center.x + (dx / dist) * circle.radius,
              y: circle.center.y + (dy / dist) * circle.radius,
            };
            evaluatePoint(nearest, 'nearest', 'Nearest', circle.id);
          }
        }
      } else if (ent.type === 'rectangle') {
        const rect = ent as any;
        const p1 = rect.origin;
        const p2 = { x: rect.origin.x + rect.width, y: rect.origin.y };
        const p3 = { x: rect.origin.x + rect.width, y: rect.origin.y + rect.height };
        const p4 = { x: rect.origin.x, y: rect.origin.y + rect.height };

        if (this.settings.endpoint) {
          evaluatePoint(p1, 'endpoint', 'Corner', rect.id);
          evaluatePoint(p2, 'endpoint', 'Corner', rect.id);
          evaluatePoint(p3, 'endpoint', 'Corner', rect.id);
          evaluatePoint(p4, 'endpoint', 'Corner', rect.id);
        }
        if (this.settings.midpoint) {
          evaluatePoint({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
          evaluatePoint({ x: p2.x, y: (p2.y + p3.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
          evaluatePoint({ x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
          evaluatePoint({ x: p1.x, y: (p1.y + p4.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
        }
        if (this.settings.center) {
          evaluatePoint({ x: rect.origin.x + rect.width / 2, y: rect.origin.y + rect.height / 2 }, 'center', 'Center', rect.id);
        }
      } else if (ent.type === 'polyline') {
        const poly = ent as any;
        const pts: Point2D[] = poly.points || [];
        for (let i = 0; i < pts.length; i++) {
          if (this.settings.endpoint) {
            evaluatePoint(pts[i], 'endpoint', 'Vertex', poly.id);
          }
          if (i > 0 && this.settings.midpoint) {
            const prev = pts[i - 1];
            const curr = pts[i];
            evaluatePoint({ x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 }, 'midpoint', 'Midpoint', poly.id);
          }
        }
        if (poly.closed && pts.length > 2 && this.settings.midpoint) {
          const first = pts[0];
          const last = pts[pts.length - 1];
          evaluatePoint({ x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 }, 'midpoint', 'Midpoint', poly.id);
        }
      } else if (ent.type === 'arc') {
        const arc = ent as any;
        if (this.settings.center) {
          evaluatePoint(arc.center, 'center', 'Center', arc.id);
        }
        if (this.settings.endpoint) {
          evaluatePoint(
            {
              x: arc.center.x + arc.radius * Math.cos(arc.startAngle),
              y: arc.center.y + arc.radius * Math.sin(arc.startAngle),
            },
            'endpoint',
            'Endpoint',
            arc.id
          );
          evaluatePoint(
            {
              x: arc.center.x + arc.radius * Math.cos(arc.endAngle),
              y: arc.center.y + arc.radius * Math.sin(arc.endAngle),
            },
            'endpoint',
            'Endpoint',
            arc.id
          );
        }
      }
    }

    return bestCandidate;
  }

  private closestPointOnSegment(p: Point2D, a: Point2D, b: Point2D): Point2D {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return a;
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    return {
      x: a.x + t * abx,
      y: a.y + t * aby,
    };
  }
}
