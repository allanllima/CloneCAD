import { Point2D } from '../types';

export interface BulgeArcInfo {
  center: Point2D;
  radius: number;
  startAngle: number;
  endAngle: number;
  sweepAngle: number;
  isClockwise: boolean;
}

export class BulgeUtils {
  /**
   * Convert AutoCAD vertex pair + bulge factor to circular arc info
   * bulge = tan(included_angle / 4)
   * bulge > 0: counterclockwise arc
   * bulge < 0: clockwise arc
   * bulge = 0: straight line
   */
  public static toArc(p1: Point2D, p2: Point2D, bulge: number): BulgeArcInfo | null {
    if (Math.abs(bulge) < 1e-6) return null;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return null;

    // Included sweep angle
    const theta = 4 * Math.atan(bulge);
    const radius = Math.abs(d / (2 * Math.sin(theta / 2)));

    // Midpoint of chord
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    // Distance from chord to arc center
    const h = (d / 2) * (1 - bulge * bulge) / (2 * bulge);

    // Normal vector perpendicular to chord (p1 -> p2)
    // Rotate (dx, dy) 90 degrees counterclockwise: (-dy, dx) / d
    const nx = -dy / d;
    const ny = dx / d;

    // Center of arc
    const cx = mx + nx * h;
    const cy = my + ny * h;

    let startAngle = Math.atan2(p1.y - cy, p1.x - cx);
    let endAngle = Math.atan2(p2.y - cy, p2.x - cx);

    if (startAngle < 0) startAngle += Math.PI * 2;
    if (endAngle < 0) endAngle += Math.PI * 2;

    const isClockwise = bulge < 0;

    return {
      center: { x: cx, y: cy },
      radius,
      startAngle,
      endAngle,
      sweepAngle: theta,
      isClockwise,
    };
  }

  /**
   * Sample points along a bulge arc segment
   */
  public static samplePoints(p1: Point2D, p2: Point2D, bulge: number, segments = 24): Point2D[] {
    const arc = this.toArc(p1, p2, bulge);
    if (!arc) return [p1, p2];

    const pts: Point2D[] = [];
    const count = Math.max(8, segments);

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const angle = arc.startAngle + t * arc.sweepAngle;
      pts.push({
        x: arc.center.x + Math.cos(angle) * arc.radius,
        y: arc.center.y + Math.sin(angle) * arc.radius,
      });
    }

    return pts;
  }
}
