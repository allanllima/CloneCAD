import { Point2D } from './types';

export interface TrackingRay {
  start: Point2D;
  end: Point2D;
  angleDeg: number;
  description: string;
}

export interface TrackingResult {
  snappedPoint: Point2D;
  rays: TrackingRay[];
  tooltip: string;
}

export class TrackingEngine {
  private polarEnabled = false;
  private polarIncrementDeg = 45; // default 45 degrees (45, 90, 135, 180, etc.)
  private otrackEnabled = true;
  private acquiredSnapPoints: Point2D[] = [];
  private maxAcquiredPoints = 4;
  private angularToleranceRad = (2.5 * Math.PI) / 180; // 2.5 degrees tolerance

  public isPolarEnabled(): boolean {
    return this.polarEnabled;
  }

  public setPolarEnabled(enabled: boolean): void {
    this.polarEnabled = enabled;
  }

  public getPolarIncrement(): number {
    return this.polarIncrementDeg;
  }

  public setPolarIncrement(deg: number): void {
    this.polarIncrementDeg = Math.max(5, Math.min(90, deg));
  }

  public isOTrackEnabled(): boolean {
    return this.otrackEnabled;
  }

  public setOTrackEnabled(enabled: boolean): void {
    this.otrackEnabled = enabled;
  }

  /**
   * Acquire an object snap point for tracking (called when hovering over a snap point)
   */
  public acquirePoint(pt: Point2D): void {
    if (!this.otrackEnabled) return;
    // Don't add duplicate
    const exists = this.acquiredSnapPoints.some(
      (p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 1e-3
    );
    if (!exists) {
      this.acquiredSnapPoints.push({ ...pt });
      if (this.acquiredSnapPoints.length > this.maxAcquiredPoints) {
        this.acquiredSnapPoints.shift();
      }
    }
  }

  public clearAcquiredPoints(): void {
    this.acquiredSnapPoints = [];
  }

  /**
   * Evaluate Polar and O-Track alignment for cursor
   */
  public evaluateTracking(
    currentWorld: Point2D,
    basePoint: Point2D | null,
    zoom: number
  ): TrackingResult | null {
    const rays: TrackingRay[] = [];
    let snapped = { ...currentWorld };
    let tooltip = '';
    const snapPixelTol = 12 / zoom;

    // 1. O-TRACK: Check horizontal and vertical alignment with acquired points
    if (this.otrackEnabled && this.acquiredSnapPoints.length > 0) {
      for (const ref of this.acquiredSnapPoints) {
        // Horizontal alignment (same Y)
        if (Math.abs(currentWorld.y - ref.y) < snapPixelTol) {
          snapped.y = ref.y;
          const rayLen = 5000 / zoom;
          rays.push({
            start: { x: ref.x - rayLen, y: ref.y },
            end: { x: ref.x + rayLen, y: ref.y },
            angleDeg: 0,
            description: `O-Track: Y = ${ref.y.toFixed(2)}`,
          });
          tooltip = `O-Track: 0° (${snapped.x.toFixed(2)}, ${ref.y.toFixed(2)})`;
        }

        // Vertical alignment (same X)
        if (Math.abs(currentWorld.x - ref.x) < snapPixelTol) {
          snapped.x = ref.x;
          const rayLen = 5000 / zoom;
          rays.push({
            start: { x: ref.x, y: ref.y - rayLen },
            end: { x: ref.x, y: ref.y + rayLen },
            angleDeg: 90,
            description: `O-Track: X = ${ref.x.toFixed(2)}`,
          });
          tooltip = `O-Track: 90° (${ref.x.toFixed(2)}, ${snapped.y.toFixed(2)})`;
        }
      }
    }

    // 2. POLAR TRACKING: If basePoint is provided, lock to polar ray increments
    if (this.polarEnabled && basePoint) {
      const dx = currentWorld.x - basePoint.x;
      const dy = currentWorld.y - basePoint.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5 / zoom) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;
        const angleDeg = (angle * 180) / Math.PI;

        const inc = this.polarIncrementDeg;
        const nearestMultiple = Math.round(angleDeg / inc) * inc;
        const diffDeg = Math.abs(angleDeg - nearestMultiple);

        if (diffDeg <= (this.angularToleranceRad * 180) / Math.PI) {
          const snappedAngleRad = (nearestMultiple * Math.PI) / 180;
          snapped = {
            x: basePoint.x + Math.cos(snappedAngleRad) * dist,
            y: basePoint.y + Math.sin(snappedAngleRad) * dist,
          };

          const rayLen = 10000 / zoom;
          rays.push({
            start: { ...basePoint },
            end: {
              x: basePoint.x + Math.cos(snappedAngleRad) * rayLen,
              y: basePoint.y + Math.sin(snappedAngleRad) * rayLen,
            },
            angleDeg: nearestMultiple % 360,
            description: `Polar: < ${nearestMultiple % 360}°`,
          });

          tooltip = `Polar: ${dist.toFixed(2)} < ${(nearestMultiple % 360).toFixed(0)}°`;
        }
      }
    }

    if (rays.length > 0) {
      return {
        snappedPoint: snapped,
        rays,
        tooltip,
      };
    }

    return null;
  }
}
