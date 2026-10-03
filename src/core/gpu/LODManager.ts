import { CADEntity, LODLevel } from '../types';
import { FrustumCuller } from './FrustumCuller';

export class LODManager {
  /**
   * Evaluates the appropriate Level of Detail (LOD) based on screen space size in pixels.
   */
  public static getLODLevel(screenSizePx: number): LODLevel {
    if (screenSizePx < 3) {
      return 'SUBPIXEL';
    } else if (screenSizePx < 24) {
      return 'LOW';
    } else if (screenSizePx < 120) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  /**
   * Calculates the approximate screen size (in pixels) for an entity given current zoom.
   */
  public static getEntityScreenSize(entity: CADEntity, zoom: number): number {
    const aabb = FrustumCuller.getEntityAABB(entity);
    const width = Math.abs(aabb.maxX - aabb.minX);
    const height = Math.abs(aabb.maxY - aabb.minY);
    const diagonal = Math.hypot(width, height);
    return diagonal * zoom;
  }

  /**
   * Returns recommended segment count for tessellating circles at given LOD.
   */
  public static getCircleSegments(lod: LODLevel): number {
    switch (lod) {
      case 'SUBPIXEL':
        return 6;
      case 'LOW':
        return 12;
      case 'MEDIUM':
        return 32;
      case 'HIGH':
        return 64;
    }
  }

  /**
   * Returns recommended segment count for tessellating arcs at given LOD.
   */
  public static getArcSegments(lod: LODLevel, angleSpanRad: number = Math.PI): number {
    const factor = Math.max(0.2, Math.abs(angleSpanRad) / (2 * Math.PI));
    switch (lod) {
      case 'SUBPIXEL':
        return Math.max(3, Math.round(6 * factor));
      case 'LOW':
        return Math.max(4, Math.round(16 * factor));
      case 'MEDIUM':
        return Math.max(8, Math.round(36 * factor));
      case 'HIGH':
        return Math.max(16, Math.round(64 * factor));
    }
  }

  /**
   * Returns recommended sample count for spline curves at given LOD.
   */
  public static getSplineSamples(lod: LODLevel): number {
    switch (lod) {
      case 'SUBPIXEL':
        return 6;
      case 'LOW':
        return 12;
      case 'MEDIUM':
        return 28;
      case 'HIGH':
        return 60;
    }
  }

  /**
   * Returns recommended segment count for ellipses at given LOD.
   */
  public static getEllipseSegments(lod: LODLevel): number {
    switch (lod) {
      case 'SUBPIXEL':
        return 6;
      case 'LOW':
        return 14;
      case 'MEDIUM':
        return 32;
      case 'HIGH':
        return 64;
    }
  }

  /**
   * Determines if text is large enough on screen to be readable and rendered.
   * If screen font size is < 3 pixels, it's sub-pixel noise and can be culled or proxy-rendered.
   */
  public static shouldRenderText(fontSize: number, zoom: number): boolean {
    return fontSize * zoom >= 3;
  }

  /**
   * Determines whether hatch internal pattern lines should be rendered.
   * Very small screen areas (e.g. < 25px²) create moiré artifacts and waste draw calls.
   */
  public static shouldRenderHatchLines(areaScreenPx: number): boolean {
    return areaScreenPx >= 25;
  }
}
