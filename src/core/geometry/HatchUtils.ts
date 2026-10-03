import { Point2D, HatchPattern } from '../types';
import { PolygonBooleanUtils } from './PolygonBooleanUtils';

export interface HatchLineSegment {
  start: Point2D;
  end: Point2D;
}

export class HatchUtils {
  /**
   * Generates line segments for a given hatch pattern clipped inside a boundary polygon
   */
  public static generatePatternLines(
    polygon: Point2D[],
    pattern: HatchPattern,
    scale = 10,
    angle = Math.PI / 4 // default 45 degrees
  ): HatchLineSegment[] {
    if (pattern === 'SOLID' || polygon.length < 3) return [];

    const spacing = Math.max(2, scale);
    const segments: HatchLineSegment[] = [];

    if (pattern === 'ANSI31') {
      // 45 degree parallel lines
      segments.push(...this.generateParallelLines(polygon, angle, spacing));
    } else if (pattern === 'ANSI32') {
      // Crossed diagonal lines
      segments.push(...this.generateParallelLines(polygon, angle, spacing));
      segments.push(...this.generateParallelLines(polygon, angle + Math.PI / 2, spacing));
    } else if (pattern === 'GRID') {
      // Orthogonal grid lines
      segments.push(...this.generateParallelLines(polygon, 0, spacing));
      segments.push(...this.generateParallelLines(polygon, Math.PI / 2, spacing));
    } else if (pattern === 'DOTS') {
      // Short dashed stipples
      const lines = this.generateParallelLines(polygon, 0, spacing);
      for (const line of lines) {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const len = Math.hypot(dx, dy);
        const steps = Math.floor(len / spacing);
        for (let i = 0; i <= steps; i++) {
          const t = i / (steps || 1);
          const px = line.start.x + t * dx;
          const py = line.start.y + t * dy;
          segments.push({
            start: { x: px - 0.5, y: py },
            end: { x: px + 0.5, y: py },
          });
        }
      }
    }

    return segments;
  }

  /**
   * Scanline algorithm for arbitrary polygon hatching at angle theta
   */
  private static generateParallelLines(
    polygon: Point2D[],
    angle: number,
    spacing: number
  ): HatchLineSegment[] {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Rotate polygon by -angle to align lines horizontally
    const rotated = polygon.map((p) => ({
      x: p.x * cosA + p.y * sinA,
      y: -p.x * sinA + p.y * cosA,
    }));

    let minY = Infinity, maxY = -Infinity;
    for (const p of rotated) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const segments: HatchLineSegment[] = [];
    const startY = Math.floor(minY / spacing) * spacing;
    const n = rotated.length;

    for (let y = startY; y <= maxY; y += spacing) {
      const intersections: number[] = [];

      for (let i = 0; i < n; i++) {
        const p1 = rotated[i];
        const p2 = rotated[(i + 1) % n];

        // Check if horizontal scanline y intersects edge p1 -> p2
        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const t = (y - p1.y) / (p2.y - p1.y);
          const x = p1.x + t * (p2.x - p1.x);
          intersections.push(x);
        }
      }

      intersections.sort((a, b) => a - b);

      // Pair up intersections
      for (let k = 0; k < intersections.length - 1; k += 2) {
        const x1 = intersections[k];
        const x2 = intersections[k + 1];

        // Rotate back by +angle
        const sX = x1 * cosA - y * sinA;
        const sY = x1 * sinA + y * cosA;
        const eX = x2 * cosA - y * sinA;
        const eY = x2 * sinA + y * cosA;

        segments.push({
          start: { x: sX, y: sY },
          end: { x: eX, y: eY },
        });
      }
    }

    return segments;
  }
}
