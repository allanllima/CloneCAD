import { BoundingBox2D, Point2D } from '../types';

export class SplineUtils {
  /**
   * Sample points along a Catmull-Rom / cubic spline
   */
  public static sampleSpline(points: Point2D[], closed = false, samplesPerSegment = 20): Point2D[] {
    if (points.length < 2) return [...points];
    if (points.length === 2) return [points[0], points[1]];

    const sampled: Point2D[] = [];
    const n = points.length;
    const pts = closed
      ? [points[n - 1], ...points, points[0], points[1]]
      : [points[0], ...points, points[n - 1]];

    const segments = closed ? n : n - 1;

    for (let i = 0; i < segments; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const p2 = pts[i + 2];
      const p3 = pts[i + 3];

      for (let j = 0; j < samplesPerSegment; j++) {
        const t = j / samplesPerSegment;
        sampled.push(this.interpolateCatmullRom(p0, p1, p2, p3, t));
      }
    }

    if (!closed) {
      sampled.push(points[points.length - 1]);
    } else {
      sampled.push(points[0]);
    }

    return sampled;
  }

  /**
   * Catmull-Rom cubic interpolation formula
   */
  private static interpolateCatmullRom(
    p0: Point2D,
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    t: number
  ): Point2D {
    const t2 = t * t;
    const t3 = t2 * t;

    const f0 = -0.5 * t3 + t2 - 0.5 * t;
    const f1 = 1.5 * t3 - 2.5 * t2 + 1.0;
    const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t;
    const f3 = 0.5 * t3 - 0.5 * t2;

    return {
      x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
      y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
    };
  }

  /**
   * Compute bounding box of a spline
   */
  public static getBounds(points: Point2D[], closed = false): BoundingBox2D {
    const sampled = this.sampleSpline(points, closed, 10);
    if (sampled.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    let minX = sampled[0].x;
    let maxX = sampled[0].x;
    let minY = sampled[0].y;
    let maxY = sampled[0].y;

    for (const p of sampled) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Closest distance from a query point to the spline curve
   */
  public static distanceToSpline(query: Point2D, controlPoints: Point2D[], closed = false): number {
    const sampled = this.sampleSpline(controlPoints, closed, 16);
    let minDist = Infinity;

    for (let i = 0; i < sampled.length - 1; i++) {
      const dist = this.distancePointToSegment(query, sampled[i], sampled[i + 1]);
      if (dist < minDist) minDist = dist;
    }

    return minDist;
  }

  private static distancePointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
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
