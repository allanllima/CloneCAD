import {
  CADEntity,
  CADLayer,
  LineEntity,
  CircleEntity,
  RectangleEntity,
  PolylineEntity,
  ArcEntity,
  BlockReferenceEntity,
  DimensionEntity,
  HatchEntity,
} from './types';
import { PolygonBooleanUtils } from './geometry/PolygonBooleanUtils';

export interface DataExtractionResult {
  summary: {
    totalEntities: number;
    totalBlocks: number;
    totalLinearLength: number; // in world units
    totalArea: number; // in square world units
  };
  blockCounts: Array<{
    blockName: string;
    count: number;
    layer: string;
    attributes: Record<string, string>;
  }>;
  linearByLayer: Array<{
    layerName: string;
    entityType: string;
    count: number;
    totalLength: number;
  }>;
  areasList: Array<{
    entityId: string;
    entityType: string;
    layerName: string;
    area: number;
    perimeter: number;
  }>;
}

export class DataExtractionManager {
  /**
   * Analyzes drawing entities and compiles a comprehensive Bill of Materials (BOM) & Quantitativo
   */
  public static extractData(
    entities: CADEntity[],
    layers: CADLayer[]
  ): DataExtractionResult {
    const layerMap = new Map(layers.map((l) => [l.id, l.name]));

    let totalBlocks = 0;
    let totalLinearLength = 0;
    let totalArea = 0;

    // 1. Group Blocks
    const blockMap = new Map<string, { count: number; layer: string; attributes: Record<string, string> }>();

    // 2. Linear Metrage (grouped by layer + entity type)
    const linearMap = new Map<string, { layerName: string; entityType: string; count: number; totalLength: number }>();

    // 3. Areas
    const areasList: DataExtractionResult['areasList'] = [];

    for (const ent of entities) {
      if (ent.visible === false) continue;
      const layerName = layerMap.get(ent.layerId) || '0';

      if (ent.type === 'insert') {
        const ins = ent as BlockReferenceEntity;
        totalBlocks++;
        const key = `${ins.blockName}__${layerName}`;
        if (!blockMap.has(key)) {
          blockMap.set(key, {
            count: 1,
            layer: layerName,
            attributes: { ...ins.attributeValues },
          });
        } else {
          const item = blockMap.get(key)!;
          item.count++;
          // Merge attributes
          Object.assign(item.attributes, ins.attributeValues);
        }
      } else if (ent.type === 'line') {
        const l = ent as LineEntity;
        const len = Math.hypot(l.end.x - l.start.x, l.end.y - l.start.y);
        totalLinearLength += len;
        this.addLinear(linearMap, layerName, 'Line', len);
      } else if (ent.type === 'circle') {
        const c = ent as CircleEntity;
        const perimeter = 2 * Math.PI * c.radius;
        const area = Math.PI * c.radius * c.radius;
        totalLinearLength += perimeter;
        totalArea += area;
        this.addLinear(linearMap, layerName, 'Circle (Perimeter)', perimeter);
        areasList.push({
          entityId: c.id,
          entityType: 'Circle',
          layerName,
          area,
          perimeter,
        });
      } else if (ent.type === 'rectangle') {
        const r = ent as RectangleEntity;
        const perimeter = 2 * (r.width + r.height);
        const area = Math.abs(r.width * r.height);
        totalLinearLength += perimeter;
        totalArea += area;
        this.addLinear(linearMap, layerName, 'Rectangle (Perimeter)', perimeter);
        areasList.push({
          entityId: r.id,
          entityType: 'Rectangle',
          layerName,
          area,
          perimeter,
        });
      } else if (ent.type === 'polyline') {
        const p = ent as PolylineEntity;
        let polyLen = 0;
        for (let i = 0; i < p.points.length - 1; i++) {
          polyLen += Math.hypot(p.points[i + 1].x - p.points[i].x, p.points[i + 1].y - p.points[i].y);
        }
        if (p.closed && p.points.length > 2) {
          const last = p.points[p.points.length - 1];
          const first = p.points[0];
          polyLen += Math.hypot(first.x - last.x, first.y - last.y);

          // Calculate area for closed polyline
          const polyArea = PolygonBooleanUtils.calculateArea(p.points);
          totalArea += polyArea;
          areasList.push({
            entityId: p.id,
            entityType: 'Closed Polyline',
            layerName,
            area: polyArea,
            perimeter: polyLen,
          });
        }
        totalLinearLength += polyLen;
        this.addLinear(linearMap, layerName, 'Polyline', polyLen);
      } else if (ent.type === 'arc') {
        const a = ent as ArcEntity;
        let sweep = a.endAngle - a.startAngle;
        if (sweep < 0) sweep += Math.PI * 2;
        const arcLen = a.radius * sweep;
        totalLinearLength += arcLen;
        this.addLinear(linearMap, layerName, 'Arc', arcLen);
      } else if (ent.type === 'hatch') {
        const h = ent as HatchEntity;
        if (h.boundary && h.boundary.length >= 3) {
          const hArea = PolygonBooleanUtils.calculateArea(h.boundary);
          totalArea += hArea;
          areasList.push({
            entityId: h.id,
            entityType: `Hatch (${h.pattern})`,
            layerName,
            area: hArea,
            perimeter: 0,
          });
        }
      }
    }

    const blockCounts = Array.from(blockMap.entries()).map(([key, data]) => ({
      blockName: key.split('__')[0],
      count: data.count,
      layer: data.layer,
      attributes: data.attributes,
    }));

    const linearByLayer = Array.from(linearMap.values());

    return {
      summary: {
        totalEntities: entities.length,
        totalBlocks,
        totalLinearLength,
        totalArea,
      },
      blockCounts,
      linearByLayer,
      areasList,
    };
  }

  private static addLinear(
    map: Map<string, { layerName: string; entityType: string; count: number; totalLength: number }>,
    layerName: string,
    entityType: string,
    len: number
  ): void {
    const key = `${layerName}__${entityType}`;
    if (!map.has(key)) {
      map.set(key, { layerName, entityType, count: 1, totalLength: len });
    } else {
      const it = map.get(key)!;
      it.count++;
      it.totalLength += len;
    }
  }

  /**
   * Generates a CSV file content with UTF-8 BOM for Microsoft Excel / LibreOffice Calc
   */
  public static generateCSV(result: DataExtractionResult): string {
    const lines: string[] = [];

    // Header BOM for Excel UTF-8 recognition
    lines.push('--- CLONECAD DATA EXTRACTION REPORT ---');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // Summary Section
    lines.push('SUMMARY');
    lines.push('Metric;Value');
    lines.push(`Total Drawing Entities;${result.summary.totalEntities}`);
    lines.push(`Total Block References;${result.summary.totalBlocks}`);
    lines.push(`Total Linear Length (World Units);${result.summary.totalLinearLength.toFixed(2)}`);
    lines.push(`Total Enclosed Area (Sq Units);${result.summary.totalArea.toFixed(2)}`);
    lines.push('');

    // Blocks & Components
    lines.push('BLOCKS & COMPONENTS INVENTORY (BOM)');
    lines.push('Block Name;Count;Layer;Attributes');
    for (const b of result.blockCounts) {
      const attrsStr = Object.entries(b.attributes)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      lines.push(`"${b.blockName}";${b.count};"${b.layer}";"${attrsStr}"`);
    }
    lines.push('');

    // Linear Metrage
    lines.push('LINEAR METRAGE BY LAYER');
    lines.push('Layer;Entity Type;Count;Total Length');
    for (const l of result.linearByLayer) {
      lines.push(`"${l.layerName}";"${l.entityType}";${l.count};${l.totalLength.toFixed(2)}`);
    }
    lines.push('');

    // Areas
    lines.push('AREAS & ROOM SURFACES');
    lines.push('ID;Type;Layer;Area;Perimeter');
    for (const a of result.areasList) {
      lines.push(`"${a.entityId}";"${a.entityType}";"${a.layerName}";${a.area.toFixed(2)};${a.perimeter.toFixed(2)}`);
    }

    return '\uFEFF' + lines.join('\r\n');
  }

  /**
   * Generates a structured JSON string
   */
  public static generateJSON(result: DataExtractionResult): string {
    return JSON.stringify(
      {
        generator: 'CloneCAD Data Extraction Engine v1.0',
        timestamp: new Date().toISOString(),
        ...result,
      },
      null,
      2
    );
  }

  /**
   * Triggers a browser file download
   */
  public static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
