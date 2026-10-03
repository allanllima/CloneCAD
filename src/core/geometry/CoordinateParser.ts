import { Point2D } from '../types';

export type CoordinateParseMode =
  | 'absolute_cartesian'
  | 'relative_cartesian'
  | 'absolute_polar'
  | 'relative_polar'
  | 'direct_distance';

export interface CoordinateParseResult {
  point: Point2D;
  mode: CoordinateParseMode;
  rawDistance?: number;
  rawAngleDeg?: number;
  description: string;
}

export class CoordinateParser {
  /**
   * Parse coordinate input string according to AutoCAD standards.
   *
   * Formats supported:
   * 1. Polar:
   *    - "@dist<ang"  -> Relative polar from basePoint (angle in degrees)
   *    - "#dist<ang"  -> Absolute polar from origin (0, 0)
   *    - "dist<ang"   -> Relative polar if basePoint is present, else absolute from (0, 0)
   * 2. Cartesian:
   *    - "@x,y"       -> Relative Cartesian from basePoint
   *    - "#x,y"       -> Absolute Cartesian
   *    - "x,y"        -> Cartesian (treated as absolute if no prefix)
   * 3. Direct Distance Entry:
   *    - "dist"       -> Distance along cursor direction from basePoint (requires basePoint and cursorPoint)
   *
   * @param input Raw text string
   * @param basePoint Base point if an active tool is in progress
   * @param cursorPoint Current cursor world position (for direct distance entry or cursor direction)
   * @param isOrthoMode Whether Ortho mode is active (locks direct distance to 0, 90, 180, 270 deg)
   */
  public static parse(
    input: string,
    basePoint?: Point2D | null,
    cursorPoint?: Point2D | null,
    isOrthoMode: boolean = false
  ): CoordinateParseResult | null {
    if (!input) return null;
    const str = input.trim();
    if (!str) return null;

    // -------------------------------------------------------------------------
    // 1. POLAR COORDINATES (e.g. "@50<45", "#100<90", "75.5<30", "50<-45")
    // -------------------------------------------------------------------------
    // Regex matches optional prefix [@#], distance, '<', and angle in degrees
    const polarRegex = /^([@#])?(-?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*<\s*(-?\d*\.?\d+(?:[eE][-+]?\d+)?)$/i;
    const polarMatch = str.match(polarRegex);

    if (polarMatch) {
      const prefix = polarMatch[1] || '';
      const dist = parseFloat(polarMatch[2]);
      const angleDeg = parseFloat(polarMatch[3]);

      if (isNaN(dist) || isNaN(angleDeg)) return null;

      const angleRad = (angleDeg * Math.PI) / 180;
      const dx = dist * Math.cos(angleRad);
      const dy = dist * Math.sin(angleRad);

      const isExplicitAbsolute = prefix === '#';
      const isExplicitRelative = prefix === '@';
      const isRelative = isExplicitRelative || (!isExplicitAbsolute && !!basePoint);

      const originX = isRelative && basePoint ? basePoint.x : 0;
      const originY = isRelative && basePoint ? basePoint.y : 0;

      const resultPoint: Point2D = {
        x: originX + dx,
        y: originY + dy,
      };

      const mode: CoordinateParseMode = isRelative ? 'relative_polar' : 'absolute_polar';
      const description = isRelative
        ? `@${dist}<${angleDeg}°`
        : `#${dist}<${angleDeg}°`;

      return {
        point: resultPoint,
        mode,
        rawDistance: dist,
        rawAngleDeg: angleDeg,
        description,
      };
    }

    // -------------------------------------------------------------------------
    // 2. CARTESIAN COORDINATES (e.g. "@10,20", "#100,50", "100.5, 20.3")
    // -------------------------------------------------------------------------
    const cartesianRegex = /^([@#])?(-?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*,\s*(-?\d*\.?\d+(?:[eE][-+]?\d+)?)$/i;
    const cartesianMatch = str.match(cartesianRegex);

    if (cartesianMatch) {
      const prefix = cartesianMatch[1] || '';
      const val1 = parseFloat(cartesianMatch[2]);
      const val2 = parseFloat(cartesianMatch[3]);

      if (isNaN(val1) || isNaN(val2)) return null;

      const isExplicitRelative = prefix === '@';
      const isRelative = isExplicitRelative && !!basePoint;

      const resultPoint: Point2D = {
        x: (isRelative && basePoint ? basePoint.x : 0) + val1,
        y: (isRelative && basePoint ? basePoint.y : 0) + val2,
      };

      const mode: CoordinateParseMode = isRelative ? 'relative_cartesian' : 'absolute_cartesian';
      const description = isRelative
        ? `@${val1},${val2}`
        : `${val1},${val2}`;

      return {
        point: resultPoint,
        mode,
        description,
      };
    }

    // -------------------------------------------------------------------------
    // 3. DIRECT DISTANCE ENTRY (e.g. "100", "50.5")
    // -------------------------------------------------------------------------
    // Only valid if both basePoint and cursorPoint are available
    const singleNumberRegex = /^(-?\d*\.?\d+(?:[eE][-+]?\d+)?)$/;
    const numMatch = str.match(singleNumberRegex);

    if (numMatch && basePoint && cursorPoint) {
      const dist = parseFloat(numMatch[1]);
      if (isNaN(dist)) return null;

      let dx = cursorPoint.x - basePoint.x;
      let dy = cursorPoint.y - basePoint.y;

      let angleRad = 0;
      if (isOrthoMode) {
        // Ortho mode snaps to closest 90 degree axis
        if (Math.abs(dx) >= Math.abs(dy)) {
          angleRad = dx >= 0 ? 0 : Math.PI;
        } else {
          angleRad = dy >= 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      } else {
        const len = Math.hypot(dx, dy);
        if (len > 1e-6) {
          angleRad = Math.atan2(dy, dx);
        } else {
          angleRad = 0; // Default to 0 deg (+X) if cursor is directly on base point
        }
      }

      const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;
      const resultPoint: Point2D = {
        x: basePoint.x + dist * Math.cos(angleRad),
        y: basePoint.y + dist * Math.sin(angleRad),
      };

      return {
        point: resultPoint,
        mode: 'direct_distance',
        rawDistance: dist,
        rawAngleDeg: angleDeg,
        description: `Direct Distance: ${dist} @ ${angleDeg.toFixed(1)}°`,
      };
    }

    return null;
  }

  /**
   * Helper to format a point relative to a base point in polar representation
   */
  public static formatPolar(
    point: Point2D,
    basePoint: Point2D
  ): { distance: number; angleDeg: number; formatted: string } {
    const dx = point.x - basePoint.x;
    const dy = point.y - basePoint.y;
    const distance = Math.hypot(dx, dy);
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    return {
      distance,
      angleDeg,
      formatted: `${distance.toFixed(2)}<${angleDeg.toFixed(1)}°`,
    };
  }

  /**
   * Helper to construct a polar point from distance and angle in degrees
   */
  public static polarPoint(
    basePoint: Point2D,
    distance: number,
    angleDeg: number
  ): Point2D {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: basePoint.x + distance * Math.cos(rad),
      y: basePoint.y + distance * Math.sin(rad),
    };
  }
}
