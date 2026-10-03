import { CADEntity, Point2D, SnapResult, SnapSettings, SnapType } from './types';
import { BulgeUtils } from './geometry/BulgeUtils';
import { SplineUtils } from './geometry/SplineUtils';
import { EllipseUtils } from './geometry/EllipseUtils';
import { PolygonBooleanUtils } from './geometry/PolygonBooleanUtils';
import { IntersectionUtils } from './geometry/IntersectionUtils';

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
    snapToleranceScreen: 20, // 20 pixels tolerance for comfortable, magnetic snapping
  };

  public getSettings(): SnapSettings {
    return { ...this.settings };
  }

  public setSettings(updates: Partial<SnapSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * Find best snap candidate for mouse position.
   * Priority is given to discrete landmark points (endpoint, midpoint, center, intersection)
   * over continuous nearest points and grid points.
   */
  public findSnap(
    entities: CADEntity[],
    rawWorld: Point2D,
    worldToScreen: (world: Point2D) => Point2D,
    screenMouse: Point2D,
    basePoint?: Point2D
  ): SnapResult | null {
    if (!this.settings.enabled) return null;

    const maxDistSq = this.settings.snapToleranceScreen * this.settings.snapToleranceScreen;

    let bestLandmark: SnapResult | null = null;
    let minLandmarkDistSq = maxDistSq;

    let bestNearest: SnapResult | null = null;
    let minNearestDistSq = maxDistSq;

    let bestGrid: SnapResult | null = null;
    let minGridDistSq = maxDistSq;

    // Helper for high-priority discrete landmarks (Endpoint, Midpoint, Center, Intersection, Perpendicular)
    const evaluateLandmark = (point: Point2D, type: SnapType, desc: string, entityId?: string) => {
      const screenPt = worldToScreen(point);
      const dx = screenPt.x - screenMouse.x;
      const dy = screenPt.y - screenMouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minLandmarkDistSq) {
        minLandmarkDistSq = distSq;
        bestLandmark = {
          point: { ...point },
          type,
          entityId,
          description: desc,
        };
      }
    };

    // Helper for continuous nearest points along edges
    const evaluateNearest = (point: Point2D, desc: string, entityId?: string) => {
      const screenPt = worldToScreen(point);
      const dx = screenPt.x - screenMouse.x;
      const dy = screenPt.y - screenMouse.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < minNearestDistSq) {
        minNearestDistSq = distSq;
        bestNearest = {
          point: { ...point },
          type: 'nearest',
          entityId,
          description: desc,
        };
      }
    };

    // 1. Grid Snap (evaluated as lowest priority fallback)
    if (this.settings.gridSnap && this.settings.gridSize > 0) {
      const gs = this.settings.gridSize;
      const snappedGrid: Point2D = {
        x: Math.round(rawWorld.x / gs) * gs,
        y: Math.round(rawWorld.y / gs) * gs,
      };
      const screenPt = worldToScreen(snappedGrid);
      const dx = screenPt.x - screenMouse.x;
      const dy = screenPt.y - screenMouse.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minGridDistSq) {
        minGridDistSq = distSq;
        bestGrid = {
          point: snappedGrid,
          type: 'grid',
          description: 'Grid',
        };
      }
    }

    // Collect segments for intersection checking
    interface SegmentRef {
      p1: Point2D;
      p2: Point2D;
      entityId: string;
    }
    const nearbySegments: SegmentRef[] = [];

    // 2. Object Snaps across visible entities
    for (const ent of entities) {
      if (ent.visible === false) continue;

      if (ent.type === 'line') {
        const line = ent as any;
        if (this.settings.endpoint) {
          evaluateLandmark(line.start, 'endpoint', 'Endpoint', line.id);
          evaluateLandmark(line.end, 'endpoint', 'Endpoint', line.id);
        }
        if (this.settings.midpoint) {
          const mid = {
            x: (line.start.x + line.end.x) / 2,
            y: (line.start.y + line.end.y) / 2,
          };
          evaluateLandmark(mid, 'midpoint', 'Midpoint', line.id);
        }
        if (this.settings.perpendicular && basePoint) {
          const perp = this.perpendicularPointOnSegment(basePoint, line.start, line.end);
          if (perp) {
            evaluateLandmark(perp, 'perpendicular', 'Perpendicular', line.id);
          }
        }
        if (this.settings.nearest) {
          const nearest = this.closestPointOnSegment(rawWorld, line.start, line.end);
          evaluateNearest(nearest, 'Nearest', line.id);
        }
        if (this.settings.intersection) {
          nearbySegments.push({ p1: line.start, p2: line.end, entityId: line.id });
        }
      } else if (ent.type === 'circle') {
        const circle = ent as any;
        if (this.settings.center) {
          evaluateLandmark(circle.center, 'center', 'Center', circle.id);
        }
        if (this.settings.endpoint) {
          // Quadrants
          evaluateLandmark({ x: circle.center.x + circle.radius, y: circle.center.y }, 'endpoint', 'Quadrant', circle.id);
          evaluateLandmark({ x: circle.center.x - circle.radius, y: circle.center.y }, 'endpoint', 'Quadrant', circle.id);
          evaluateLandmark({ x: circle.center.x, y: circle.center.y + circle.radius }, 'endpoint', 'Quadrant', circle.id);
          evaluateLandmark({ x: circle.center.x, y: circle.center.y - circle.radius }, 'endpoint', 'Quadrant', circle.id);
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
            evaluateNearest(nearest, 'Nearest', circle.id);
          }
        }
      } else if (ent.type === 'rectangle') {
        const rect = ent as any;
        const origin = rect.origin || rect.basePoint || { x: 0, y: 0 };
        const w = rect.width || 0;
        const h = rect.height || 0;
        const p1 = origin;
        const p2 = { x: origin.x + w, y: origin.y };
        const p3 = { x: origin.x + w, y: origin.y + h };
        const p4 = { x: origin.x, y: origin.y + h };

        if (this.settings.endpoint) {
          evaluateLandmark(p1, 'endpoint', 'Endpoint', rect.id);
          evaluateLandmark(p2, 'endpoint', 'Endpoint', rect.id);
          evaluateLandmark(p3, 'endpoint', 'Endpoint', rect.id);
          evaluateLandmark(p4, 'endpoint', 'Endpoint', rect.id);
        }
        if (this.settings.midpoint) {
          evaluateLandmark({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
          evaluateLandmark({ x: p2.x, y: (p2.y + p3.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
          evaluateLandmark({ x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
          evaluateLandmark({ x: p1.x, y: (p1.y + p4.y) / 2 }, 'midpoint', 'Midpoint', rect.id);
        }
        if (this.settings.center) {
          evaluateLandmark({ x: origin.x + w / 2, y: origin.y + h / 2 }, 'center', 'Center', rect.id);
        }
        if (this.settings.nearest) {
          evaluateNearest(this.closestPointOnSegment(rawWorld, p1, p2), 'Nearest', rect.id);
          evaluateNearest(this.closestPointOnSegment(rawWorld, p2, p3), 'Nearest', rect.id);
          evaluateNearest(this.closestPointOnSegment(rawWorld, p3, p4), 'Nearest', rect.id);
          evaluateNearest(this.closestPointOnSegment(rawWorld, p4, p1), 'Nearest', rect.id);
        }
        if (this.settings.intersection) {
          nearbySegments.push({ p1, p2, entityId: rect.id });
          nearbySegments.push({ p1: p2, p2: p3, entityId: rect.id });
          nearbySegments.push({ p1: p3, p2: p4, entityId: rect.id });
          nearbySegments.push({ p1: p4, p2: p1, entityId: rect.id });
        }
      } else if (ent.type === 'polyline') {
        const poly = ent as any;
        const pts: Point2D[] = poly.points || poly.vertices || [];
        for (let i = 0; i < pts.length; i++) {
          if (this.settings.endpoint) {
            evaluateLandmark(pts[i], 'endpoint', 'Endpoint', poly.id);
          }
          if (i > 0) {
            const prev = pts[i - 1];
            const curr = pts[i];
            if ((prev as any).bulge) {
              const arc = BulgeUtils.toArc(prev, curr, (prev as any).bulge);
              if (arc) {
                if (this.settings.midpoint) {
                  const midAngle = arc.startAngle + arc.sweepAngle / 2;
                  evaluateLandmark(
                    {
                      x: arc.center.x + Math.cos(midAngle) * arc.radius,
                      y: arc.center.y + Math.sin(midAngle) * arc.radius,
                    },
                    'midpoint',
                    'Midpoint',
                    poly.id
                  );
                }
                if (this.settings.center) {
                  evaluateLandmark(arc.center, 'center', 'Center', poly.id);
                }
              }
            } else if (this.settings.midpoint) {
              evaluateLandmark({ x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 }, 'midpoint', 'Midpoint', poly.id);
            }
            if (this.settings.nearest) {
              evaluateNearest(this.closestPointOnSegment(rawWorld, prev, curr), 'Nearest', poly.id);
            }
            if (this.settings.intersection) {
              nearbySegments.push({ p1: prev, p2: curr, entityId: poly.id });
            }
          }
        }
        if (poly.closed && pts.length > 2) {
          const first = pts[0];
          const last = pts[pts.length - 1];
          if ((last as any).bulge) {
            const arc = BulgeUtils.toArc(last, first, (last as any).bulge);
            if (arc) {
              if (this.settings.midpoint) {
                const midAngle = arc.startAngle + arc.sweepAngle / 2;
                evaluateLandmark(
                  {
                    x: arc.center.x + Math.cos(midAngle) * arc.radius,
                    y: arc.center.y + Math.sin(midAngle) * arc.radius,
                  },
                  'midpoint',
                  'Midpoint',
                  poly.id
                );
              }
              if (this.settings.center) {
                evaluateLandmark(arc.center, 'center', 'Center', poly.id);
              }
            }
          } else if (this.settings.midpoint) {
            evaluateLandmark({ x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 }, 'midpoint', 'Midpoint', poly.id);
          }
          if (this.settings.nearest) {
            evaluateNearest(this.closestPointOnSegment(rawWorld, last, first), 'Nearest', poly.id);
          }
          if (this.settings.intersection) {
            nearbySegments.push({ p1: last, p2: first, entityId: poly.id });
          }
        }
      } else if (ent.type === 'arc') {
        const arc = ent as any;
        if (this.settings.center) {
          evaluateLandmark(arc.center, 'center', 'Center', arc.id);
        }
        if (this.settings.endpoint) {
          evaluateLandmark(
            {
              x: arc.center.x + arc.radius * Math.cos(arc.startAngle),
              y: arc.center.y + arc.radius * Math.sin(arc.startAngle),
            },
            'endpoint',
            'Endpoint',
            arc.id
          );
          evaluateLandmark(
            {
              x: arc.center.x + arc.radius * Math.cos(arc.endAngle),
              y: arc.center.y + arc.radius * Math.sin(arc.endAngle),
            },
            'endpoint',
            'Endpoint',
            arc.id
          );
        }
        if (this.settings.midpoint) {
          let s = arc.startAngle;
          let e = arc.endAngle;
          if (e < s) e += Math.PI * 2;
          const midAngle = s + (e - s) / 2;
          evaluateLandmark(
            {
              x: arc.center.x + arc.radius * Math.cos(midAngle),
              y: arc.center.y + arc.radius * Math.sin(midAngle),
            },
            'midpoint',
            'Midpoint',
            arc.id
          );
        }
        if (this.settings.nearest) {
          const pt = this.closestPointOnArc(rawWorld, arc.center, arc.radius, arc.startAngle, arc.endAngle);
          if (pt) {
            evaluateNearest(pt, 'Nearest', arc.id);
          }
        }
      } else if (ent.type === 'spline') {
        const spl = ent as any;
        const pts: Point2D[] = spl.controlPoints || [];
        if (this.settings.endpoint) {
          for (let i = 0; i < pts.length; i++) {
            evaluateLandmark(pts[i], 'endpoint', i === 0 || i === pts.length - 1 ? 'Endpoint' : 'Control Point', spl.id);
          }
        }
      } else if (ent.type === 'ellipse') {
        const el = ent as any;
        if (this.settings.center) {
          evaluateLandmark(el.center, 'center', 'Center', el.id);
        }
        if (this.settings.endpoint) {
          const cosR = Math.cos(el.rotation || 0);
          const sinR = Math.sin(el.rotation || 0);
          evaluateLandmark({ x: el.center.x + el.radiusX * cosR, y: el.center.y + el.radiusX * sinR }, 'endpoint', 'Quadrant', el.id);
          evaluateLandmark({ x: el.center.x - el.radiusX * cosR, y: el.center.y - el.radiusX * sinR }, 'endpoint', 'Quadrant', el.id);
          evaluateLandmark({ x: el.center.x - el.radiusY * sinR, y: el.center.y + el.radiusY * cosR }, 'endpoint', 'Quadrant', el.id);
          evaluateLandmark({ x: el.center.x + el.radiusY * sinR, y: el.center.y - el.radiusY * cosR }, 'endpoint', 'Quadrant', el.id);
        }
      } else if (ent.type === 'hatch') {
        const h = ent as any;
        const poly: Point2D[] = h.boundary || [];
        if (this.settings.center) {
          const centroid = PolygonBooleanUtils.calculateCentroid(poly);
          evaluateLandmark(centroid, 'center', 'Centroid', h.id);
        }
        if (this.settings.endpoint) {
          for (const p of poly) {
            evaluateLandmark(p, 'endpoint', 'Endpoint', h.id);
          }
        }
      }
    }

    // 3. Intersection Snaps (between nearby segments)
    if (this.settings.intersection && nearbySegments.length >= 2) {
      for (let i = 0; i < nearbySegments.length; i++) {
        for (let j = i + 1; j < nearbySegments.length; j++) {
          const s1 = nearbySegments[i];
          const s2 = nearbySegments[j];
          if (s1.entityId === s2.entityId) continue;

          const inter = IntersectionUtils.segmentSegmentIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
          if (inter) {
            evaluateLandmark(inter, 'intersection', 'Intersection');
          }
        }
      }
    }

    // Priority Resolution:
    // 1. Discrete landmarks (Endpoint, Midpoint, Center, Intersection, Perpendicular)
    // 2. Nearest point on edge
    // 3. Grid point
    if (bestLandmark) {
      return bestLandmark;
    }
    if (bestNearest) {
      return bestNearest;
    }
    if (bestGrid) {
      return bestGrid;
    }

    return null;
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

  private perpendicularPointOnSegment(base: Point2D, a: Point2D, b: Point2D): Point2D | null {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return null;
    const t = ((base.x - a.x) * abx + (base.y - a.y) * aby) / ab2;
    if (t >= -0.01 && t <= 1.01) {
      return {
        x: a.x + t * abx,
        y: a.y + t * aby,
      };
    }
    return null;
  }

  private closestPointOnArc(p: Point2D, center: Point2D, radius: number, startAngle: number, endAngle: number): Point2D | null {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    let ang = Math.atan2(dy, dx);
    if (ang < 0) ang += Math.PI * 2;

    let s = startAngle;
    let e = endAngle;
    while (s < 0) s += Math.PI * 2;
    while (e < 0) e += Math.PI * 2;

    let inRange = false;
    if (s <= e) {
      inRange = ang >= s && ang <= e;
    } else {
      inRange = ang >= s || ang <= e;
    }

    if (inRange) {
      return {
        x: center.x + radius * Math.cos(ang),
        y: center.y + radius * Math.sin(ang),
      };
    }
    return null;
  }
}

