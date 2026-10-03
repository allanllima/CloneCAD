import { describe, it, expect, beforeEach } from 'vitest';
import { CADCore } from '../core/CADCore';
import { BlockManager } from '../core/BlockManager';
import { GripManager } from '../core/GripManager';
import {
  LineEntity,
  CircleEntity,
  RectangleEntity,
  BlockReferenceEntity,
  CADBlockDefinition,
  DimensionEntity,
  MultileaderEntity,
} from '../core/types';

describe('Fase 3: Sistema de Blocos, Atributos, Biblioteca de Símbolos & Grips', () => {
  let blockManager: BlockManager;
  let gripManager: GripManager;

  beforeEach(() => {
    blockManager = new BlockManager();
    gripManager = new GripManager();
  });

  describe('BlockManager & Symbol Library', () => {
    it('deve carregar automaticamente a biblioteca padrão de símbolos', () => {
      expect(blockManager.hasBlock('DOOR_80')).toBe(true);
      expect(blockManager.hasBlock('WINDOW_120')).toBe(true);
      expect(blockManager.hasBlock('ELEC_OUTLET_110V')).toBe(true);
      expect(blockManager.hasBlock('TITLE_BLOCK_STAMP')).toBe(true);

      const door = blockManager.getBlock('DOOR_80');
      expect(door).toBeDefined();
      expect(door!.entities.length).toBeGreaterThan(0);
      expect(door!.category).toBe('architecture');
    });

    it('deve registrar nova definição de bloco customizado', () => {
      const customDef: CADBlockDefinition = {
        id: 'blk_column_30x30',
        name: 'COLUMN_30X30',
        basePoint: { x: 0, y: 0 },
        entities: [
          {
            id: 'rec_1',
            type: 'rectangle',
            layerId: '0',
            origin: { x: -15, y: -15 },
            width: 30,
            height: 30,
            visible: true,
          } as RectangleEntity,
        ],
        attributes: [
          {
            tag: 'ID',
            prompt: 'Column Tag',
            defaultValue: 'P1',
            position: { x: 0, y: 0 },
          },
        ],
        category: 'civil',
      };

      blockManager.registerBlock(customDef);
      expect(blockManager.hasBlock('COLUMN_30X30')).toBe(true);
      expect(blockManager.getBlock('COLUMN_30X30')!.attributes[0].tag).toBe('ID');
    });

    it('deve explodir uma referência de bloco aplicando matriz de rotação e translação', () => {
      const instance: BlockReferenceEntity = {
        id: 'ins_door_1',
        type: 'insert',
        layerId: '0',
        blockName: 'DOOR_80',
        position: { x: 100, y: 50 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        attributeValues: { TAG: 'P1' },
        visible: true,
      };

      const exploded = blockManager.explodeBlock(instance);
      expect(exploded.length).toBeGreaterThan(0);

      // Todas as entidades explodidas devem estar deslocadas a partir de (100, 50)
      for (const ent of exploded) {
        expect(ent.id).toMatch(/exp|exploded/);
        if (ent.type === 'line') {
          const l = ent as LineEntity;
          expect(l.start.x).toBeGreaterThanOrEqual(95);
          expect(l.start.y).toBeGreaterThanOrEqual(45);
        }
      }
    });
  });

  describe('GripManager (Pontos de Controle Interativos & Stretch)', () => {
    it('deve gerar grips geométricos para linhas, círculos e retângulos', () => {
      const line: LineEntity = {
        id: 'line_g',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        visible: true,
      };
      const lineGrips = gripManager.getEntityGrips(line);
      expect(lineGrips).toHaveLength(3); // start, mid, end

      const circle: CircleEntity = {
        id: 'circle_g',
        type: 'circle',
        layerId: '0',
        center: { x: 50, y: 50 },
        radius: 20,
        visible: true,
      };
      const circleGrips = gripManager.getEntityGrips(circle);
      expect(circleGrips).toHaveLength(5); // center + 4 quadrants

      const rect: RectangleEntity = {
        id: 'rect_g',
        type: 'rectangle',
        layerId: '0',
        origin: { x: 0, y: 0 },
        width: 40,
        height: 20,
        visible: true,
      };
      const rectGrips = gripManager.getEntityGrips(rect);
      expect(rectGrips).toHaveLength(5); // 4 corners + center
    });

    it('deve esticar linha ao arrastar grip de extremidade (Stretch)', () => {
      const line: LineEntity = {
        id: 'line_g',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        visible: true,
      };
      const grips = gripManager.getEntityGrips(line);
      const endGrip = grips.find((g) => g.id.endsWith('_end'))!;

      // Arrastar fim para (25, 0)
      const updated = gripManager.updateEntityWithGrip(line, endGrip, { x: 25, y: 0 }) as LineEntity;
      expect(updated.start).toEqual({ x: 0, y: 0 });
      expect(updated.end).toEqual({ x: 25, y: 0 });
    });

    it('deve transladar linha ao arrastar grip de ponto médio', () => {
      const line: LineEntity = {
        id: 'line_g',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        visible: true,
      };
      const grips = gripManager.getEntityGrips(line);
      const midGrip = grips.find((g) => g.id.endsWith('_mid'))!;

      // Mover o ponto médio de (5, 0) para (5, 10)
      const updated = gripManager.updateEntityWithGrip(line, midGrip, { x: 5, y: 10 }) as LineEntity;
      expect(updated.start).toEqual({ x: 0, y: 10 });
      expect(updated.end).toEqual({ x: 10, y: 10 });
    });
  });
});
