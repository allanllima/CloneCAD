import {
  CADBlockDefinition,
  CADEntity,
  BlockReferenceEntity,
  Point2D,
  LineEntity,
  CircleEntity,
  RectangleEntity,
  ArcEntity,
  TextEntity,
} from './types';
import { STANDARD_SYMBOLS } from './SymbolLibrary';

export class BlockManager {
  private blocks: Map<string, CADBlockDefinition> = new Map();
  private onBlockChanged?: () => void;

  constructor(onBlockChanged?: () => void) {
    this.onBlockChanged = onBlockChanged;
    this.loadStandardSymbols();
  }

  private loadStandardSymbols(): void {
    for (const sym of STANDARD_SYMBOLS) {
      this.blocks.set(sym.name.toUpperCase(), { ...sym });
    }
  }

  public registerBlock(def: CADBlockDefinition): void {
    this.blocks.set(def.name.toUpperCase(), { ...def });
    this.onBlockChanged?.();
  }

  public getBlock(name: string): CADBlockDefinition | undefined {
    return this.blocks.get(name.toUpperCase());
  }

  public getAllBlocks(): CADBlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  public getBlocksByCategory(category: string): CADBlockDefinition[] {
    return Array.from(this.blocks.values()).filter((b) => b.category === category);
  }

  public hasBlock(name: string): boolean {
    return this.blocks.has(name.toUpperCase());
  }

  public removeBlock(name: string): boolean {
    const deleted = this.blocks.delete(name.toUpperCase());
    if (deleted) {
      this.onBlockChanged?.();
    }
    return deleted;
  }

  /**
   * Creates a new BlockReferenceEntity instance in the drawing
   */
  public instantiateBlock(
    blockName: string,
    position: Point2D,
    options: {
      scale?: { x: number; y: number };
      rotation?: number;
      layerId?: string;
      attributes?: Record<string, string>;
    } = {}
  ): BlockReferenceEntity | null {
    const def = this.getBlock(blockName);
    if (!def) return null;

    const initialAttributes: Record<string, string> = {};
    if (def.attributes) {
      for (const attr of def.attributes) {
        initialAttributes[attr.tag] = options.attributes?.[attr.tag] ?? attr.defaultValue;
      }
    }

    const refEntity: BlockReferenceEntity = {
      id: `block_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'insert',
      blockName: def.name,
      layerId: options.layerId || '0',
      position: { ...position },
      scale: options.scale || { x: 1, y: 1 },
      rotation: options.rotation || 0,
      attributeValues: initialAttributes,
      visible: true,
    };

    return refEntity;
  }

  /**
   * Decomposes a BlockReferenceEntity into independent scene entities,
   * applying position, rotation, scale, and baking attributes into text entities.
   */
  public explodeBlock(ref: BlockReferenceEntity): CADEntity[] {
    const def = this.getBlock(ref.blockName);
    if (!def) return [];

    const result: CADEntity[] = [];
    const cosR = Math.cos(ref.rotation);
    const sinR = Math.sin(ref.rotation);
    const sx = ref.scale.x;
    const sy = ref.scale.y;

    const transformPoint = (p: Point2D): Point2D => {
      // 1. Offset relative to block base point
      const relX = (p.x - def.basePoint.x) * sx;
      const relY = (p.y - def.basePoint.y) * sy;
      // 2. Rotate around insertion point
      const rotX = relX * cosR - relY * sinR;
      const rotY = relX * sinR + relY * cosR;
      // 3. Translate to world insertion position
      return {
        x: ref.position.x + rotX,
        y: ref.position.y + rotY,
      };
    };

    for (const sub of def.entities) {
      const copy = JSON.parse(JSON.stringify(sub)) as CADEntity;
      copy.id = `${copy.type}_exploded_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      copy.layerId = ref.layerId;

      if (copy.type === 'line') {
        const line = copy as LineEntity;
        line.start = transformPoint(line.start);
        line.end = transformPoint(line.end);
        result.push(line);
      } else if (copy.type === 'circle') {
        const circle = copy as CircleEntity;
        circle.center = transformPoint(circle.center);
        circle.radius = circle.radius * Math.max(Math.abs(sx), Math.abs(sy));
        result.push(circle);
      } else if (copy.type === 'rectangle') {
        // If rotated or unequal scale, decompose rectangle into lines
        const rect = copy as RectangleEntity;
        const p1 = transformPoint(rect.origin);
        const p2 = transformPoint({ x: rect.origin.x + rect.width, y: rect.origin.y });
        const p3 = transformPoint({ x: rect.origin.x + rect.width, y: rect.origin.y + rect.height });
        const p4 = transformPoint({ x: rect.origin.x, y: rect.origin.y + rect.height });

        result.push(
          { id: `line_exp_${Date.now()}_1`, type: 'line', layerId: ref.layerId, start: p1, end: p2, visible: true },
          { id: `line_exp_${Date.now()}_2`, type: 'line', layerId: ref.layerId, start: p2, end: p3, visible: true },
          { id: `line_exp_${Date.now()}_3`, type: 'line', layerId: ref.layerId, start: p3, end: p4, visible: true },
          { id: `line_exp_${Date.now()}_4`, type: 'line', layerId: ref.layerId, start: p4, end: p1, visible: true }
        );
      } else if (copy.type === 'arc') {
        const arc = copy as ArcEntity;
        arc.center = transformPoint(arc.center);
        arc.radius = arc.radius * Math.max(Math.abs(sx), Math.abs(sy));
        arc.startAngle += ref.rotation;
        arc.endAngle += ref.rotation;
        result.push(arc);
      } else if (copy.type === 'text') {
        const txt = copy as TextEntity;
        txt.position = transformPoint(txt.position);
        txt.fontSize = txt.fontSize * Math.abs(sy);
        txt.rotation = (txt.rotation || 0) + ref.rotation;
        result.push(txt);
      } else if (copy.type === 'hatch') {
        const h = copy as any;
        h.boundary = h.boundary.map(transformPoint);
        result.push(h);
      } else {
        result.push(copy);
      }
    }

    // Convert attributes to TextEntity
    if (def.attributes) {
      for (const attr of def.attributes) {
        const val = ref.attributeValues[attr.tag] ?? attr.defaultValue;
        const pt = transformPoint(attr.position);
        const textEntity: TextEntity = {
          id: `attr_exp_${Date.now()}_${attr.tag}`,
          type: 'text',
          layerId: ref.layerId,
          position: pt,
          text: val,
          fontSize: (attr.fontSize || 10) * Math.abs(sy),
          rotation: ref.rotation,
          visible: true,
        };
        result.push(textEntity);
      }
    }

    return result;
  }
}
