import {
  CADEntity,
  CADLayer,
  Point2D,
  LineEntity,
  CircleEntity,
  ArcEntity,
  PolylineEntity,
  PolylineVertex,
  TextEntity,
  SplineEntity,
  EllipseEntity,
  HatchEntity,
  BlockReferenceEntity,
  CADBlockDefinition,
  DimensionEntity,
  ImageEntity,
} from '../types';

export interface DXFParseResult {
  layers: CADLayer[];
  entities: CADEntity[];
  blocks: CADBlockDefinition[];
  header: Record<string, any>;
}

interface DXFGroup {
  code: number;
  value: string;
}

/**
 * Standard AutoCAD Color Index (ACI) to Hex Color converter
 */
export function aciToHex(aci: number): string {
  const standardAci: Record<number, string> = {
    1: '#ff0000', // Red
    2: '#ffff00', // Yellow
    3: '#00ff00', // Green
    4: '#00ffff', // Cyan
    5: '#0000ff', // Blue
    6: '#ff00ff', // Magenta
    7: '#ffffff', // White / Black depending on bg
    8: '#808080', // Dark Gray
    9: '#c0c0c0', // Light Gray
  };

  if (standardAci[aci]) return standardAci[aci];
  if (aci <= 0 || aci >= 256) return '#ffffff';

  // Approximate HSV wheel for ACI 10-249
  const hue = ((aci - 10) / 240) * 360;
  return hslToHex(hue, 80, 50);
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export class DXFParser {
  /**
   * Parse complete ASCII DXF string into CAD Layers, Entities and Blocks
   */
  public parse(dxfString: string, scaleFactor = 1.0): DXFParseResult {
    return DXFParser.parse(dxfString, scaleFactor);
  }

  public static parse(dxfString: string, scaleFactor = 1.0): DXFParseResult {
    const groups = this.tokenize(dxfString);
    const layers: CADLayer[] = [];
    const entities: CADEntity[] = [];
    const blocks: CADBlockDefinition[] = [];
    const header: Record<string, any> = {};

    let i = 0;
    while (i < groups.length) {
      const g = groups[i];
      if (g.code === 0 && g.value === 'SECTION') {
        i++;
        if (i < groups.length && groups[i].code === 2) {
          const sectionName = groups[i].value;
          i++;

          if (sectionName === 'HEADER') {
            i = this.parseHeader(groups, i, header);
          } else if (sectionName === 'TABLES') {
            i = this.parseTables(groups, i, layers);
          } else if (sectionName === 'BLOCKS') {
            i = this.parseBlocks(groups, i, blocks, scaleFactor);
          } else if (sectionName === 'ENTITIES') {
            i = this.parseEntities(groups, i, entities, scaleFactor);
          }
        }
      } else {
        i++;
      }
    }

    // Ensure layer 0 exists
    if (!layers.some((l) => l.name === '0')) {
      layers.unshift({
        id: '0',
        name: '0',
        color: '#ffffff',
        visible: true,
        locked: false,
        lineWeight: 1,
      });
    }

    return { layers, entities, blocks, header };
  }

  private static tokenize(dxf: string): DXFGroup[] {
    const lines = dxf.split(/\r?\n/);
    const groups: DXFGroup[] = [];
    for (let i = 0; i < lines.length - 1; i += 2) {
      const codeStr = lines[i].trim();
      const value = lines[i + 1]?.trim() ?? '';
      if (!codeStr) continue;
      const code = parseInt(codeStr, 10);
      if (!isNaN(code)) {
        groups.push({ code, value });
      }
    }
    return groups;
  }

  private static parseHeader(
    groups: DXFGroup[],
    startIndex: number,
    header: Record<string, any>
  ): number {
    let i = startIndex;
    let currentVar = '';
    while (i < groups.length) {
      const g = groups[i];
      if (g.code === 0 && g.value === 'ENDSEC') return i + 1;
      if (g.code === 9) {
        currentVar = g.value;
      } else if (currentVar) {
        header[currentVar] = g.value;
      }
      i++;
    }
    return i;
  }

  private static parseTables(
    groups: DXFGroup[],
    startIndex: number,
    layers: CADLayer[]
  ): number {
    let i = startIndex;
    while (i < groups.length) {
      const g = groups[i];
      if (g.code === 0 && g.value === 'ENDSEC') return i + 1;

      if (g.code === 0 && g.value === 'LAYER') {
        i++;
        let name = '0';
        let colorAci = 7;
        let visible = true;
        let locked = false;

        while (i < groups.length && groups[i].code !== 0) {
          const sub = groups[i];
          if (sub.code === 2) name = sub.value;
          if (sub.code === 62) {
            const c = parseInt(sub.value, 10);
            if (c < 0) {
              visible = false;
              colorAci = Math.abs(c);
            } else {
              colorAci = c;
            }
          }
          if (sub.code === 70) {
            const flags = parseInt(sub.value, 10);
            if (flags & 4) locked = true;
          }
          i++;
        }

        layers.push({
          id: name,
          name,
          color: aciToHex(colorAci),
          visible,
          locked,
          lineWeight: 1,
        });
      } else {
        i++;
      }
    }
    return i;
  }

  private static parseBlocks(
    groups: DXFGroup[],
    startIndex: number,
    blocks: CADBlockDefinition[],
    scaleFactor: number
  ): number {
    let i = startIndex;
    while (i < groups.length) {
      const g = groups[i];
      if (g.code === 0 && g.value === 'ENDSEC') return i + 1;

      if (g.code === 0 && g.value === 'BLOCK') {
        i++;
        let name = '';
        let baseX = 0;
        let baseY = 0;
        const subEntities: CADEntity[] = [];

        while (i < groups.length && groups[i].code !== 0) {
          if (groups[i].code === 2) name = groups[i].value;
          if (groups[i].code === 10) baseX = parseFloat(groups[i].value) * scaleFactor;
          if (groups[i].code === 20) baseY = parseFloat(groups[i].value) * scaleFactor;
          i++;
        }

        // Parse inner block entities until ENDBLK
        while (i < groups.length) {
          if (groups[i].code === 0 && groups[i].value === 'ENDBLK') {
            i++;
            break;
          }
          if (groups[i].code === 0) {
            const nextI = this.parseEntity(groups, i, subEntities, scaleFactor);
            if (nextI === i) i++;
            else i = nextI;
          } else {
            i++;
          }
        }

        if (name) {
          blocks.push({
            id: `blk_${name.toLowerCase()}`,
            name,
            basePoint: { x: baseX, y: baseY },
            entities: subEntities,
            attributes: [],
            category: 'custom',
          });
        }
      } else {
        i++;
      }
    }
    return i;
  }

  private static parseEntities(
    groups: DXFGroup[],
    startIndex: number,
    entities: CADEntity[],
    scaleFactor: number
  ): number {
    let i = startIndex;
    while (i < groups.length) {
      const g = groups[i];
      if (g.code === 0 && g.value === 'ENDSEC') return i + 1;

      if (g.code === 0) {
        const nextI = this.parseEntity(groups, i, entities, scaleFactor);
        if (nextI === i) i++;
        else i = nextI;
      } else {
        i++;
      }
    }
    return i;
  }

  private static parseEntity(
    groups: DXFGroup[],
    startIndex: number,
    entities: CADEntity[],
    scaleFactor: number
  ): number {
    const type = groups[startIndex].value;
    let i = startIndex + 1;

    let layerId = '0';
    let color: string | undefined = undefined;
    const props: Record<number, string[]> = {};

    while (i < groups.length && groups[i].code !== 0) {
      const c = groups[i].code;
      const v = groups[i].value;
      if (c === 8) layerId = v;
      if (c === 62) {
        color = aciToHex(Math.abs(parseInt(v, 10)));
      }
      if (!props[c]) props[c] = [];
      props[c].push(v);
      i++;
    }

    const id = `ent_${type.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    switch (type) {
      case 'LINE': {
        const x1 = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const y1 = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const x2 = parseFloat(props[11]?.[0] || '0') * scaleFactor;
        const y2 = parseFloat(props[21]?.[0] || '0') * scaleFactor;
        entities.push({
          id,
          type: 'line',
          layerId,
          color,
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          visible: true,
        } as LineEntity);
        break;
      }

      case 'POINT': {
        const x = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const y = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        entities.push({
          id,
          type: 'circle',
          layerId,
          color,
          center: { x, y },
          radius: 0.5 * scaleFactor,
          visible: true,
        } as CircleEntity);
        break;
      }

      case 'CIRCLE': {
        const cx = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const cy = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const r = parseFloat(props[40]?.[0] || '1') * scaleFactor;
        entities.push({
          id,
          type: 'circle',
          layerId,
          color,
          center: { x: cx, y: cy },
          radius: r,
          visible: true,
        } as CircleEntity);
        break;
      }

      case 'ARC': {
        const cx = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const cy = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const r = parseFloat(props[40]?.[0] || '1') * scaleFactor;
        const startDeg = parseFloat(props[50]?.[0] || '0');
        const endDeg = parseFloat(props[51]?.[0] || '360');
        entities.push({
          id,
          type: 'arc',
          layerId,
          color,
          center: { x: cx, y: cy },
          radius: r,
          startAngle: (startDeg * Math.PI) / 180,
          endAngle: (endDeg * Math.PI) / 180,
          visible: true,
        } as ArcEntity);
        break;
      }

      case 'LWPOLYLINE': {
        const xs = (props[10] || []).map((v) => parseFloat(v) * scaleFactor);
        const ys = (props[20] || []).map((v) => parseFloat(v) * scaleFactor);
        const bulges = (props[42] || []).map((v) => parseFloat(v));
        const flags = parseInt(props[70]?.[0] || '0', 10);
        const closed = (flags & 1) === 1;

        const points: PolylineVertex[] = [];
        for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
          points.push({
            x: xs[k],
            y: ys[k],
            bulge: bulges[k] || 0,
          });
        }

        if (points.length >= 2) {
          entities.push({
            id,
            type: 'polyline',
            layerId,
            color,
            vertices: points,
            points,
            closed,
            visible: true,
          } as PolylineEntity);
        }
        break;
      }

      case 'ELLIPSE': {
        const cx = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const cy = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const mx = parseFloat(props[11]?.[0] || '1') * scaleFactor;
        const my = parseFloat(props[21]?.[0] || '0') * scaleFactor;
        const majorRadius = Math.hypot(mx, my);
        const ratio = parseFloat(props[40]?.[0] || '0.5');
        const rotation = Math.atan2(my, mx);

        entities.push({
          id,
          type: 'ellipse',
          layerId,
          color,
          center: { x: cx, y: cy },
          radiusX: majorRadius,
          radiusY: majorRadius * ratio,
          rotation,
          startAngle: 0,
          endAngle: Math.PI * 2,
          visible: true,
        } as EllipseEntity);
        break;
      }

      case 'SPLINE': {
        const xs = (props[10] || []).map((v) => parseFloat(v) * scaleFactor);
        const ys = (props[20] || []).map((v) => parseFloat(v) * scaleFactor);
        const ctrl: Point2D[] = [];
        for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
          ctrl.push({ x: xs[k], y: ys[k] });
        }
        const flags = parseInt(props[70]?.[0] || '0', 10);
        const closed = (flags & 1) === 1;

        if (ctrl.length >= 2) {
          entities.push({
            id,
            type: 'spline',
            layerId,
            color,
            controlPoints: ctrl,
            closed,
            visible: true,
          } as SplineEntity);
        }
        break;
      }

      case 'TEXT':
      case 'MTEXT': {
        const x = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const y = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const textStr = props[1]?.[0] || '';
        const size = parseFloat(props[40]?.[0] || '10') * scaleFactor;
        const rotDeg = parseFloat(props[50]?.[0] || '0');

        entities.push({
          id,
          type: 'text',
          layerId,
          color,
          position: { x, y },
          text: textStr.replace(/\\P/g, '\n'), // handle AutoCAD newline in MTEXT
          fontSize: Math.max(2, size),
          rotation: (rotDeg * Math.PI) / 180,
          visible: true,
        } as TextEntity);
        break;
      }

      case 'INSERT': {
        const blockName = props[2]?.[0] || 'BLOCK';
        const posX = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const posY = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const sx = parseFloat(props[41]?.[0] || '1');
        const sy = parseFloat(props[42]?.[0] || '1');
        const rotDeg = parseFloat(props[50]?.[0] || '0');

        entities.push({
          id,
          type: 'insert',
          layerId,
          color,
          blockName,
          position: { x: posX, y: posY },
          scale: { x: sx, y: sy },
          rotation: (rotDeg * Math.PI) / 180,
          attributeValues: {},
          visible: true,
        } as BlockReferenceEntity);
        break;
      }

      case 'DIMENSION': {
        const x1 = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const y1 = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const x2 = parseFloat(props[11]?.[0] || '0') * scaleFactor;
        const y2 = parseFloat(props[21]?.[0] || '0') * scaleFactor;
        const x3 = parseFloat(props[13]?.[0] || '0') * scaleFactor;
        const y3 = parseFloat(props[23]?.[0] || '0') * scaleFactor;
        const textOverride = props[1]?.[0] || undefined;
        const measurement = Math.hypot(x2 - x1, y2 - y1);

        entities.push({
          id,
          type: 'dimension',
          layerId,
          color,
          dimType: 'linear',
          defPoint1: { x: x1, y: y1 },
          defPoint2: { x: x2, y: y2 },
          dimLinePoint: { x: x3, y: y3 },
          measurement,
          textOverride,
          visible: true,
        } as DimensionEntity);
        break;
      }

      case 'IMAGE': {
        const x = parseFloat(props[10]?.[0] || '0') * scaleFactor;
        const y = parseFloat(props[20]?.[0] || '0') * scaleFactor;
        const w = parseFloat(props[13]?.[0] || '100') * scaleFactor;
        const h = parseFloat(props[24]?.[0] || '100') * scaleFactor;
        entities.push({
          id,
          type: 'image',
          layerId,
          position: { x, y },
          width: w,
          height: h,
          url: '',
          visible: true,
        } as ImageEntity);
        break;
      }
    }

    return i;
  }
}
