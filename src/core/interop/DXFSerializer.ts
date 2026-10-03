import {
  CADEntity,
  CADLayer,
  LineEntity,
  CircleEntity,
  ArcEntity,
  PolylineEntity,
  TextEntity,
  SplineEntity,
  EllipseEntity,
  HatchEntity,
  BlockReferenceEntity,
  CADBlockDefinition,
  DimensionEntity,
  RectangleEntity,
} from '../types';

/**
 * Maps Hex color to closest AutoCAD Color Index (ACI 1-255)
 */
export function hexToAci(hex?: string): number {
  if (!hex || hex === 'object_color') return 7;
  const clean = hex.toLowerCase().replace('#', '');
  if (clean === 'ff0000' || clean === 'e06c75') return 1; // Red
  if (clean === 'ffff00' || clean === 'e5c07b') return 2; // Yellow
  if (clean === '00ff00' || clean === '98c379') return 3; // Green
  if (clean === '00ffff' || clean === '00e5ff' || clean === '56b6c2') return 4; // Cyan
  if (clean === '0000ff' || clean === '61afef') return 5; // Blue
  if (clean === 'ff00ff' || clean === 'c678dd') return 6; // Magenta
  if (clean === 'ffffff') return 7; // White
  if (clean === '808080' || clean === '5c6370') return 8; // Gray
  if (clean === 'c0c0c0' || clean === 'abb2bf') return 9; // Light Gray

  // Default ACI 7 (White/Black)
  return 7;
}

export class DXFSerializer {
  /**
   * Serialize entities, layers, and blocks into standard ASCII DXF (AC1015 AutoCAD 2000 format)
   */
  public static serialize(
    entities: CADEntity[],
    layers: CADLayer[],
    blocks: CADBlockDefinition[] = []
  ): string {
    const lines: string[] = [];

    const pair = (code: number, val: string | number) => {
      lines.push(code.toString());
      lines.push(val.toString());
    };

    // -------------------------------------------------------------------------
    // 1. HEADER SECTION
    // -------------------------------------------------------------------------
    pair(0, 'SECTION');
    pair(2, 'HEADER');
    pair(9, '$ACADVER');
    pair(1, 'AC1015'); // AutoCAD 2000 format (maximum industrial compatibility)
    pair(9, '$INSUNITS');
    pair(70, 4); // Millimeters
    pair(9, '$MEASUREMENT');
    pair(70, 1); // Metric
    pair(0, 'ENDSEC');

    // -------------------------------------------------------------------------
    // 2. TABLES SECTION
    // -------------------------------------------------------------------------
    pair(0, 'SECTION');
    pair(2, 'TABLES');

    // LTYPE Table
    pair(0, 'TABLE');
    pair(2, 'LTYPE');
    pair(70, 1);
    pair(0, 'LTYPE');
    pair(2, 'CONTINUOUS');
    pair(70, 0);
    pair(3, 'Solid line');
    pair(72, 65);
    pair(73, 0);
    pair(40, 0.0);
    pair(0, 'ENDTAB');

    // LAYER Table
    pair(0, 'TABLE');
    pair(2, 'LAYER');
    pair(70, layers.length);

    for (const l of layers) {
      pair(0, 'LAYER');
      pair(2, l.name.toUpperCase());
      pair(70, l.locked ? 4 : 0);
      const aci = hexToAci(l.color);
      pair(62, l.visible ? aci : -aci);
      pair(6, 'CONTINUOUS');
    }
    pair(0, 'ENDTAB');

    // STYLE Table
    pair(0, 'TABLE');
    pair(2, 'STYLE');
    pair(70, 1);
    pair(0, 'STYLE');
    pair(2, 'STANDARD');
    pair(70, 0);
    pair(40, 0.0);
    pair(41, 1.0);
    pair(50, 0.0);
    pair(71, 0);
    pair(42, 2.5);
    pair(3, 'txt');
    pair(4, '');
    pair(0, 'ENDTAB');

    pair(0, 'ENDSEC');

    // -------------------------------------------------------------------------
    // 3. BLOCKS SECTION
    // -------------------------------------------------------------------------
    pair(0, 'SECTION');
    pair(2, 'BLOCKS');

    for (const blk of blocks) {
      pair(0, 'BLOCK');
      pair(2, blk.name.toUpperCase());
      pair(70, 0);
      pair(10, blk.basePoint.x.toFixed(4));
      pair(20, blk.basePoint.y.toFixed(4));
      pair(30, 0.0);
      pair(3, blk.name.toUpperCase());
      pair(1, '');

      // Inner entities of block
      for (const ent of blk.entities) {
        this.writeEntityDXF(ent, pair);
      }

      pair(0, 'ENDBLK');
    }

    pair(0, 'ENDSEC');

    // -------------------------------------------------------------------------
    // 4. ENTITIES SECTION
    // -------------------------------------------------------------------------
    pair(0, 'SECTION');
    pair(2, 'ENTITIES');

    for (const ent of entities) {
      if (ent.visible === false) continue;
      this.writeEntityDXF(ent, pair);
    }

    pair(0, 'ENDSEC');

    // -------------------------------------------------------------------------
    // 5. EOF
    // -------------------------------------------------------------------------
    pair(0, 'EOF');

    return lines.join('\n') + '\n';
  }

  private static writeEntityDXF(
    ent: CADEntity,
    pair: (code: number, val: string | number) => void
  ): void {
    const layer = (ent.layerId || '0').toUpperCase();
    const colorCode = ent.color ? hexToAci(ent.color) : undefined;

    switch (ent.type) {
      case 'line': {
        const l = ent as LineEntity;
        pair(0, 'LINE');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(10, l.start.x.toFixed(4));
        pair(20, l.start.y.toFixed(4));
        pair(30, 0.0);
        pair(11, l.end.x.toFixed(4));
        pair(21, l.end.y.toFixed(4));
        pair(31, 0.0);
        break;
      }

      case 'circle': {
        const c = ent as CircleEntity;
        pair(0, 'CIRCLE');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(10, c.center.x.toFixed(4));
        pair(20, c.center.y.toFixed(4));
        pair(30, 0.0);
        pair(40, c.radius.toFixed(4));
        break;
      }

      case 'arc': {
        const a = ent as ArcEntity;
        pair(0, 'ARC');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(10, a.center.x.toFixed(4));
        pair(20, a.center.y.toFixed(4));
        pair(30, 0.0);
        pair(40, a.radius.toFixed(4));
        pair(50, ((a.startAngle * 180) / Math.PI).toFixed(4));
        pair(51, ((a.endAngle * 180) / Math.PI).toFixed(4));
        break;
      }

      case 'rectangle': {
        const r = ent as RectangleEntity;
        pair(0, 'LWPOLYLINE');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(90, 4); // 4 vertices
        pair(70, 1); // closed

        const p1 = r.origin;
        const p2 = { x: r.origin.x + r.width, y: r.origin.y };
        const p3 = { x: r.origin.x + r.width, y: r.origin.y + r.height };
        const p4 = { x: r.origin.x, y: r.origin.y + r.height };

        for (const pt of [p1, p2, p3, p4]) {
          pair(10, pt.x.toFixed(4));
          pair(20, pt.y.toFixed(4));
        }
        break;
      }

      case 'polyline': {
        const pl = ent as PolylineEntity;
        const pts = pl.points || pl.vertices || [];
        pair(0, 'LWPOLYLINE');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(90, pts.length);
        pair(70, pl.closed ? 1 : 0);

        for (const pt of pts) {
          pair(10, pt.x.toFixed(4));
          pair(20, pt.y.toFixed(4));
          if (pt.bulge && Math.abs(pt.bulge) > 1e-5) {
            pair(42, pt.bulge.toFixed(6));
          }
        }
        break;
      }

      case 'ellipse': {
        const el = ent as EllipseEntity;
        pair(0, 'ELLIPSE');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(10, el.center.x.toFixed(4));
        pair(20, el.center.y.toFixed(4));
        pair(30, 0.0);

        const majorX = el.radiusX * Math.cos(el.rotation || 0);
        const majorY = el.radiusX * Math.sin(el.rotation || 0);
        pair(11, majorX.toFixed(4));
        pair(21, majorY.toFixed(4));
        pair(31, 0.0);
        pair(40, (el.radiusY / el.radiusX).toFixed(6));
        pair(41, (el.startAngle || 0).toFixed(4));
        pair(42, (el.endAngle || Math.PI * 2).toFixed(4));
        break;
      }

      case 'spline': {
        const sp = ent as SplineEntity;
        pair(0, 'SPLINE');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(70, sp.closed ? 1 : 8); // planar spline
        pair(71, 3); // degree 3
        pair(73, sp.controlPoints.length);

        for (const pt of sp.controlPoints) {
          pair(10, pt.x.toFixed(4));
          pair(20, pt.y.toFixed(4));
          pair(30, 0.0);
        }
        break;
      }

      case 'text': {
        const t = ent as TextEntity;
        pair(0, 'TEXT');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(10, t.position.x.toFixed(4));
        pair(20, t.position.y.toFixed(4));
        pair(30, 0.0);
        pair(40, (t.fontSize || 10).toFixed(4));
        pair(1, t.text);
        if (t.rotation) {
          pair(50, ((t.rotation * 180) / Math.PI).toFixed(4));
        }
        break;
      }

      case 'insert': {
        const ins = ent as BlockReferenceEntity;
        pair(0, 'INSERT');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(2, ins.blockName.toUpperCase());
        pair(10, ins.position.x.toFixed(4));
        pair(20, ins.position.y.toFixed(4));
        pair(30, 0.0);
        pair(41, (ins.scale?.x || 1).toFixed(4));
        pair(42, (ins.scale?.y || 1).toFixed(4));
        pair(43, 1.0);
        if (ins.rotation) {
          pair(50, ((ins.rotation * 180) / Math.PI).toFixed(4));
        }
        break;
      }

      case 'dimension': {
        const dim = ent as DimensionEntity;
        pair(0, 'DIMENSION');
        pair(8, layer);
        if (colorCode) pair(62, colorCode);
        pair(70, 0); // Aligned/Linear
        pair(10, (dim.dimLinePoint?.x || 0).toFixed(4));
        pair(20, (dim.dimLinePoint?.y || 0).toFixed(4));
        pair(30, 0.0);
        pair(13, (dim.defPoint1?.x || 0).toFixed(4));
        pair(23, (dim.defPoint1?.y || 0).toFixed(4));
        pair(33, 0.0);
        pair(14, (dim.defPoint2?.x || 0).toFixed(4));
        pair(24, (dim.defPoint2?.y || 0).toFixed(4));
        pair(34, 0.0);
        if (dim.textOverride) {
          pair(1, dim.textOverride);
        }
        break;
      }
    }
  }
}
