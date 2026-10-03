import { CADEntity, Point2D } from '../types';

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CullingResult {
  visible: CADEntity[];
  culled: CADEntity[];
  totalCount: number;
  visibleCount: number;
  culledCount: number;
  cullingRatio: number; // 0 to 1
}

export class FrustumCuller {
  /**
   * Computes the 2D Axis-Aligned Bounding Box (AABB) for any CADEntity.
   */
  public static getEntityAABB(entity: CADEntity): BoundingBox2D {
    switch (entity.type) {
      case 'line': {
        const line = entity as any;
        return {
          minX: Math.min(line.start.x, line.end.x),
          maxX: Math.max(line.start.x, line.end.x),
          minY: Math.min(line.start.y, line.end.y),
          maxY: Math.max(line.start.y, line.end.y),
        };
      }
      case 'circle': {
        const circle = entity as any;
        const r = circle.radius || 0;
        return {
          minX: circle.center.x - r,
          maxX: circle.center.x + r,
          minY: circle.center.y - r,
          maxY: circle.center.y + r,
        };
      }
      case 'rectangle': {
        const rect = entity as any;
        const pt = rect.origin || rect.basePoint || { x: 0, y: 0 };
        const x1 = pt.x;
        const y1 = pt.y;
        const x2 = x1 + (rect.width || 0);
        const y2 = y1 + (rect.height || 0);
        return {
          minX: Math.min(x1, x2),
          maxX: Math.max(x1, x2),
          minY: Math.min(y1, y2),
          maxY: Math.max(y1, y2),
        };
      }
      case 'arc': {
        const arc = entity as any;
        const r = arc.radius || 0;
        return {
          minX: arc.center.x - r,
          maxX: arc.center.x + r,
          minY: arc.center.y - r,
          maxY: arc.center.y + r,
        };
      }
      case 'ellipse': {
        const ellipse = entity as any;
        const maxR = Math.max(ellipse.radiusX || 0, ellipse.radiusY || 0);
        return {
          minX: ellipse.center.x - maxR,
          maxX: ellipse.center.x + maxR,
          minY: ellipse.center.y - maxR,
          maxY: ellipse.center.y + maxR,
        };
      }
      case 'polyline': {
        const poly = entity as any;
        const pts: Point2D[] = poly.points || poly.vertices || [];
        if (pts.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        let minX = pts[0].x;
        let maxX = pts[0].x;
        let minY = pts[0].y;
        let maxY = pts[0].y;
        for (let i = 1; i < pts.length; i++) {
          minX = Math.min(minX, pts[i].x);
          maxX = Math.max(maxX, pts[i].x);
          minY = Math.min(minY, pts[i].y);
          maxY = Math.max(maxY, pts[i].y);
        }
        return { minX, maxX, minY, maxY };
      }
      case 'spline': {
        const spline = entity as any;
        const pts: Point2D[] = spline.controlPoints || [];
        if (pts.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        let minX = pts[0].x;
        let maxX = pts[0].x;
        let minY = pts[0].y;
        let maxY = pts[0].y;
        for (let i = 1; i < pts.length; i++) {
          minX = Math.min(minX, pts[i].x);
          maxX = Math.max(maxX, pts[i].x);
          minY = Math.min(minY, pts[i].y);
          maxY = Math.max(maxY, pts[i].y);
        }
        return { minX, maxX, minY, maxY };
      }
      case 'hatch': {
        const hatch = entity as any;
        const pts: Point2D[] = hatch.boundary || [];
        if (pts.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        let minX = pts[0].x;
        let maxX = pts[0].x;
        let minY = pts[0].y;
        let maxY = pts[0].y;
        for (let i = 1; i < pts.length; i++) {
          minX = Math.min(minX, pts[i].x);
          maxX = Math.max(maxX, pts[i].x);
          minY = Math.min(minY, pts[i].y);
          maxY = Math.max(maxY, pts[i].y);
        }
        return { minX, maxX, minY, maxY };
      }
      case 'text': {
        const text = entity as any;
        const fs = text.fontSize || 12;
        const str = text.text || '';
        const approxWidth = str.length * fs * 0.7;
        const approxHeight = fs * 1.2;
        return {
          minX: text.position.x,
          maxX: text.position.x + approxWidth,
          minY: text.position.y - approxHeight * 0.2,
          maxY: text.position.y + approxHeight,
        };
      }
      case 'image': {
        const img = entity as any;
        const w = img.width || 100;
        const h = img.height || 100;
        return {
          minX: img.position.x,
          maxX: img.position.x + w,
          minY: img.position.y,
          maxY: img.position.y + h,
        };
      }
      case 'dimension': {
        const dim = entity as any;
        const pts: Point2D[] = [dim.defPoint1, dim.defPoint2, dim.textPosition].filter(Boolean);
        if (pts.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        let minX = pts[0].x;
        let maxX = pts[0].x;
        let minY = pts[0].y;
        let maxY = pts[0].y;
        for (let i = 1; i < pts.length; i++) {
          minX = Math.min(minX, pts[i].x);
          maxX = Math.max(maxX, pts[i].x);
          minY = Math.min(minY, pts[i].y);
          maxY = Math.max(maxY, pts[i].y);
        }
        return { minX, maxX, minY, maxY };
      }
      default: {
        return { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 };
      }
    }
  }

  /**
   * Checks if an AABB intersects or is contained within the viewport bounds plus margin.
   */
  public static intersects(box: BoundingBox2D, viewportBounds: BoundingBox2D, margin: number = 0): boolean {
    return (
      box.maxX >= viewportBounds.minX - margin &&
      box.minX <= viewportBounds.maxX + margin &&
      box.maxY >= viewportBounds.minY - margin &&
      box.minY <= viewportBounds.maxY + margin
    );
  }

  /**
   * Performs dynamic frustum culling on an array of CADEntities against the current viewport bounds.
   */
  public static cull(
    entities: CADEntity[],
    viewportBounds: BoundingBox2D,
    margin: number = 20
  ): CullingResult {
    const visible: CADEntity[] = [];
    const culled: CADEntity[] = [];

    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      // Invisible entities are skipped
      if (ent.visible === false) {
        culled.push(ent);
        continue;
      }

      const box = FrustumCuller.getEntityAABB(ent);
      if (FrustumCuller.intersects(box, viewportBounds, margin)) {
        visible.push(ent);
      } else {
        culled.push(ent);
      }
    }

    const totalCount = entities.length;
    const visibleCount = visible.length;
    const culledCount = culled.length;
    const cullingRatio = totalCount > 0 ? culledCount / totalCount : 0;

    return {
      visible,
      culled,
      totalCount,
      visibleCount,
      culledCount,
      cullingRatio,
    };
  }
}
