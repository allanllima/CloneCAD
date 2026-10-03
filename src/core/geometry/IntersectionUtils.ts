import { Point2D, LineEntity, CircleEntity } from '../types';

export class IntersectionUtils {
  /**
   * Intersection point of two infinite 2D lines (p1->p2 and p3->p4)
   */
  public static lineLineIntersection(
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    p4: Point2D
  ): Point2D | null {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d) < 1e-9) return null; // Parallel or coincident

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  }

  /**
   * Intersection of two finite line segments (returns point only if intersection lies within both segments)
   */
  public static segmentSegmentIntersection(
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    p4: Point2D,
    tolerance = 1e-5
  ): Point2D | null {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d) < 1e-9) return null;

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;

    if (t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance) {
      return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
      };
    }
    return null;
  }

  /**
   * Intersection points of a line segment with a circle
   */
  public static lineSegmentCircleIntersections(
    p1: Point2D,
    p2: Point2D,
    center: Point2D,
    radius: number
  ): Point2D[] {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-9) return [];

    const a = lenSq;
    const b = 2 * (dx * (p1.x - center.x) + dy * (p1.y - center.y));
    const c = (p1.x - center.x) ** 2 + (p1.y - center.y) ** 2 - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return [];

    const points: Point2D[] = [];
    const sqrtDisc = Math.sqrt(discriminant);

    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    if (t1 >= -1e-5 && t1 <= 1 + 1e-5) {
      points.push({ x: p1.x + t1 * dx, y: p1.y + t1 * dy });
    }
    if (t2 >= -1e-5 && t2 <= 1 + 1e-5 && Math.abs(t1 - t2) > 1e-5) {
      points.push({ x: p1.x + t2 * dx, y: p1.y + t2 * dy });
    }

    return points;
  }

  /**
   * Reflect a point across an infinite line passing through axisStart and axisEnd
   */
  public static reflectPointAcrossLine(
    pt: Point2D,
    axisStart: Point2D,
    axisEnd: Point2D
  ): Point2D {
    const dx = axisEnd.x - axisStart.x;
    const dy = axisEnd.y - axisStart.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1e-9) return { ...pt };

    // Projection scalar t of pt onto line
    const t = ((pt.x - axisStart.x) * dx + (pt.y - axisStart.y) * dy) / d2;
    const projX = axisStart.x + t * dx;
    const projY = axisStart.y + t * dy;

    // Mirrored point: 2 * proj - pt
    return {
      x: 2 * projX - pt.x,
      y: 2 * projY - pt.y,
    };
  }

  /**
   * Project point onto segment
   */
  public static projectPointOntoSegment(p: Point2D, a: Point2D, b: Point2D): Point2D {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const ab2 = abx * abx + aby * aby;
    if (ab2 === 0) return { ...a };
    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));
    return {
      x: a.x + t * abx,
      y: a.y + t * aby,
    };
  }
}
