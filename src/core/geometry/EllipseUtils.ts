import { BoundingBox2D, Point2D } from '../types';

export class EllipseUtils {
  /**
   * Sample points along an ellipse or elliptical arc
   */
  public static sampleEllipse(
    center: Point2D,
    radiusX: number,
    radiusY: number,
    rotation = 0,
    startAngle = 0,
    endAngle = Math.PI * 2,
    segments = 64
  ): Point2D[] {
    const pts: Point2D[] = [];
    let s = startAngle;
    let e = endAngle;
    if (e < s) e += Math.PI * 2;
    const sweep = e - s;

    const cosRot = Math.cos(rotation);
    const sinRot = Math.sin(rotation);

    for (let i = 0; i <= segments; i++) {
      const theta = s + (i / segments) * sweep;
      const lx = radiusX * Math.cos(theta);
      const ly = radiusY * Math.sin(theta);

      pts.push({
        x: center.x + (lx * cosRot - ly * sinRot),
        y: center.y + (lx * sinRot + ly * cosRot),
      });
    }

    return pts;
  }

  /**
   * Get bounding box for rotated ellipse
   */
  public static getBounds(
    center: Point2D,
    radiusX: number,
    radiusY: number,
    rotation = 0
  ): BoundingBox2D {
    // Exact analytical bounds of rotated ellipse
    const cosR = Math.cos(rotation);
    const sinR = Math.sin(rotation);

    const halfW = Math.sqrt(radiusX * radiusX * cosR * cosR + radiusY * radiusY * sinR * sinR);
    const halfH = Math.sqrt(radiusX * radiusX * sinR * sinR + radiusY * radiusY * cosR * cosR);

    return {
      minX: center.x - halfW,
      maxX: center.x + halfW,
      minY: center.y - halfH,
      maxY: center.y + halfH,
    };
  }

  /**
   * Closest distance from query point to ellipse circumference
   */
  public static distanceToEllipse(
    query: Point2D,
    center: Point2D,
    radiusX: number,
    radiusY: number,
    rotation = 0
  ): number {
    // Transform point to local ellipse coordinate system
    const cosR = Math.cos(-rotation);
    const sinR = Math.sin(-rotation);
    const dx = query.x - center.x;
    const dy = query.y - center.y;

    const lx = dx * cosR - dy * sinR;
    const ly = dx * sinR + dy * cosR;

    // Approximate distance by projecting to angle
    const angle = Math.atan2(ly * radiusX, lx * radiusY);
    const projX = radiusX * Math.cos(angle);
    const projY = radiusY * Math.sin(angle);

    return Math.hypot(lx - projX, ly - projY);
  }
}
