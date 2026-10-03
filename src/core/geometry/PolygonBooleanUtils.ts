import { Point2D, BoundingBox2D } from '../types';

export class PolygonBooleanUtils {
  /**
   * Test whether a point is inside a polygon (Ray Casting Algorithm)
   */
  public static isPointInPolygon(pt: Point2D, polygon: Point2D[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect =
        yi > pt.y !== yj > pt.y &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Polygon Area via Shoelace formula
   */
  public static calculateArea(polygon: Point2D[]): number {
    let area = 0;
    const n = polygon.length;
    if (n < 3) return 0;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }

    return Math.abs(area) / 2;
  }

  /**
   * Polygon Centroid
   */
  public static calculateCentroid(polygon: Point2D[]): Point2D {
    const n = polygon.length;
    if (n === 0) return { x: 0, y: 0 };
    if (n === 1) return { ...polygon[0] };
    if (n === 2) return { x: (polygon[0].x + polygon[1].x) / 2, y: (polygon[0].y + polygon[1].y) / 2 };

    let cx = 0, cy = 0;
    let signedArea = 0;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const factor = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
      cx += (polygon[i].x + polygon[j].x) * factor;
      cy += (polygon[i].y + polygon[j].y) * factor;
      signedArea += factor;
    }

    signedArea *= 0.5;
    if (Math.abs(signedArea) < 1e-6) {
      // Fallback to bounding center
      return this.getCenter(polygon);
    }

    return {
      x: cx / (6 * signedArea),
      y: cy / (6 * signedArea),
    };
  }

  public static getBounds(polygon: Point2D[]): BoundingBox2D {
    if (polygon.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let minX = polygon[0].x, maxX = polygon[0].x;
    let minY = polygon[0].y, maxY = polygon[0].y;
    for (const p of polygon) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  /**
   * Ear Clipping Triangulation for 2D Simple Polygons
   * Returns array of triangle vertex indices: [i1, i2, i3, i4, i5, i6, ...]
   */
  public static triangulate(polygon: Point2D[]): number[] {
    const n = polygon.length;
    if (n < 3) return [];

    const indices: number[] = [];
    const V: number[] = [];
    for (let i = 0; i < n; i++) V.push(i);

    // Ensure counter-clockwise orientation
    if (this.signedArea(polygon) < 0) {
      V.reverse();
    }

    let count = 2 * V.length;
    let v = V.length - 1;

    while (V.length > 2) {
      if (count-- <= 0) {
        // Fallback for degenerates / complex self-intersections
        break;
      }

      const u = v >= V.length ? 0 : v;
      v = u + 1 >= V.length ? 0 : u + 1;
      const w = v + 1 >= V.length ? 0 : v + 1;

      if (this.isEar(polygon, u, v, w, V)) {
        indices.push(V[u], V[v], V[w]);
        V.splice(v, 1);
        count = 2 * V.length;
      }
    }

    return indices;
  }

  private static signedArea(pts: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return area * 0.5;
  }

  private static isEar(pts: Point2D[], u: number, v: number, w: number, V: number[]): boolean {
    const a = pts[V[u]], b = pts[V[v]], c = pts[V[w]];

    // Must be convex
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (cross <= 1e-6) return false;

    // No other vertex inside triangle (a, b, c)
    for (let p = 0; p < V.length; p++) {
      if (p === u || p === v || p === w) continue;
      if (this.pointInTriangle(pts[V[p]], a, b, c)) return false;
    }

    return true;
  }

  private static pointInTriangle(p: Point2D, a: Point2D, b: Point2D, c: Point2D): boolean {
    const cross1 = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const cross2 = (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x);
    const cross3 = (a.x - c.x) * (p.y - c.y) - (a.y - c.y) * (p.x - c.x);

    const hasNeg = cross1 < 0 || cross2 < 0 || cross3 < 0;
    const hasPos = cross1 > 0 || cross2 > 0 || cross3 > 0;

    return !(hasNeg && hasPos);
  }

  private static getCenter(pts: Point2D[]): Point2D {
    let sumX = 0, sumY = 0;
    for (const p of pts) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / pts.length, y: sumY / pts.length };
  }
}
