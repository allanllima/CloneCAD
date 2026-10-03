import { describe, it, expect, beforeEach } from 'vitest';
import { DimStyleManager } from '../core/DimStyleManager';
import { DataExtractionManager } from '../core/DataExtractionManager';
import {
  CADEntity,
  CADLayer,
  LineEntity,
  CircleEntity,
  RectangleEntity,
  BlockReferenceEntity,
  DimensionEntity,
  MultileaderEntity,
} from '../core/types';

describe('Fase 4: Dimensionamento, Normas ABNT/ISO & Extração de Dados (BOM)', () => {
  let dimStyleManager: DimStyleManager;

  beforeEach(() => {
    dimStyleManager = new DimStyleManager();
  });

  describe('DimStyleManager (Estilos de Cota e Normas)', () => {
    it('deve carregar estilos padrão incluindo ABNT NBR 10126 e ISO-25', () => {
      const styles = dimStyleManager.getStyles();
      expect(styles.length).toBeGreaterThanOrEqual(4);

      const abnt = dimStyleManager.getStyle('abnt_nbr_10126');
      expect(abnt).toBeDefined();
      expect(abnt!.decimalSeparator).toBe(',');
      expect(abnt!.suffix).toBe(' mm');

      const iso = dimStyleManager.getStyle('iso_25');
      expect(iso).toBeDefined();
      expect(iso!.decimalSeparator).toBe('.');
    });

    it('deve formatar medição de acordo com estilo ABNT (vírgula e sufixo)', () => {
      const abnt = dimStyleManager.getStyle('abnt_nbr_10126')!;
      const text = dimStyleManager.formatMeasurement(123.456, 'linear', abnt);
      expect(text).toBe('123,46 mm');
    });

    it('deve incluir símbolo de diâmetro (Ø) e raio (R)', () => {
      const std = dimStyleManager.getStyle('standard')!;
      const diamText = dimStyleManager.formatMeasurement(50, 'diameter', std);
      expect(diamText).toBe('Ø 50.00');

      const radText = dimStyleManager.formatMeasurement(25, 'radial', std);
      expect(radText).toBe('R 25.00');
    });

    it('deve incluir símbolo de graus (°) para cota angular', () => {
      const std = dimStyleManager.getStyle('standard')!;
      const angText = dimStyleManager.formatMeasurement(45.5, 'angular', std);
      expect(angText).toBe('45.50°');
    });

    it('deve exibir limites de tolerância quando ativado (Mecânica)', () => {
      const mech = dimStyleManager.getStyle('mech_tolerance')!;
      const tolText = dimStyleManager.formatMeasurement(100, 'linear', mech);
      expect(tolText).toContain('[+0.05/-0.05]');
    });

    it('deve permitir substituição de texto com máscara <>', () => {
      const std = dimStyleManager.getStyle('standard')!;
      const overridden = dimStyleManager.formatMeasurement(80, 'linear', std, '<> (MIN)');
      expect(overridden).toBe('80.00 (MIN)');
    });
  });

  describe('DataExtractionManager (Extração de Quantitativos / BOM)', () => {
    const mockLayers: CADLayer[] = [
      { id: '0', name: '0', color: '#ffffff', visible: true, locked: false, lineWeight: 1 },
      { id: 'walls', name: 'PAREDES', color: '#00e5ff', visible: true, locked: false, lineWeight: 2 },
      { id: 'elec', name: 'ELETRICA', color: '#ffff00', visible: true, locked: false, lineWeight: 1 },
    ];

    const mockEntities: CADEntity[] = [
      // Paredes (Linhas)
      { id: 'w1', type: 'line', layerId: 'walls', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, visible: true } as LineEntity,
      { id: 'w2', type: 'line', layerId: 'walls', start: { x: 100, y: 0 }, end: { x: 100, y: 50 }, visible: true } as LineEntity,
      // Cômodo (Retângulo)
      { id: 'room1', type: 'rectangle', layerId: 'walls', origin: { x: 0, y: 0 }, width: 10, height: 10, visible: true } as RectangleEntity,
      // Círculo
      { id: 'circ1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 10, visible: true } as CircleEntity,
      // Blocos de Elétrica
      {
        id: 'out1',
        type: 'insert',
        layerId: 'elec',
        blockName: 'ELEC_OUTLET_110V',
        position: { x: 20, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        attributeValues: { CIRCUIT: 'CIR_01', POWER: '100W' },
        visible: true,
      } as BlockReferenceEntity,
      {
        id: 'out2',
        type: 'insert',
        layerId: 'elec',
        blockName: 'ELEC_OUTLET_110V',
        position: { x: 40, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        attributeValues: { CIRCUIT: 'CIR_01', POWER: '100W' },
        visible: true,
      } as BlockReferenceEntity,
      {
        id: 'door1',
        type: 'insert',
        layerId: 'walls',
        blockName: 'DOOR_80',
        position: { x: 50, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        attributeValues: { TAG: 'P1' },
        visible: true,
      } as BlockReferenceEntity,
    ];

    it('deve extrair quantitativo correto de blocos agrupados por nome', () => {
      const res = DataExtractionManager.extractData(mockEntities, mockLayers);
      expect(res.summary.totalBlocks).toBe(3);

      const outletItem = res.blockCounts.find((b) => b.blockName === 'ELEC_OUTLET_110V');
      expect(outletItem).toBeDefined();
      expect(outletItem!.count).toBe(2);
      expect(outletItem!.layer).toBe('ELETRICA');
      expect(outletItem!.attributes.CIRCUIT).toBe('CIR_01');

      const doorItem = res.blockCounts.find((b) => b.blockName === 'DOOR_80');
      expect(doorItem).toBeDefined();
      expect(doorItem!.count).toBe(1);
    });

    it('deve calcular comprimentos lineares por camada e áreas de superfícies', () => {
      const res = DataExtractionManager.extractData(mockEntities, mockLayers);
      // Linhas w1 (100) + w2 (50) = 150 na camada PAREDES
      const wallLines = res.linearByLayer.find((l) => l.layerName === 'PAREDES' && l.entityType === 'Line');
      expect(wallLines).toBeDefined();
      expect(wallLines!.totalLength).toBeCloseTo(150, 2);

      // Área do retângulo room1 (10x10 = 100)
      const rectArea = res.areasList.find((a) => a.entityType === 'Rectangle');
      expect(rectArea).toBeDefined();
      expect(rectArea!.area).toBeCloseTo(100, 2);
      expect(rectArea!.perimeter).toBeCloseTo(40, 2);
    });

    it('deve gerar arquivo CSV formatado com cabeçalho UTF-8 BOM', () => {
      const res = DataExtractionManager.extractData(mockEntities, mockLayers);
      const csv = DataExtractionManager.generateCSV(res);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('CLONECAD DATA EXTRACTION REPORT');
      expect(csv).toContain('BLOCKS & COMPONENTS INVENTORY (BOM)');
      expect(csv).toContain('"ELEC_OUTLET_110V";2;"ELETRICA"');
    });

    it('deve gerar arquivo JSON estruturado', () => {
      const res = DataExtractionManager.extractData(mockEntities, mockLayers);
      const jsonStr = DataExtractionManager.generateJSON(res);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.generator).toContain('CloneCAD');
      expect(parsed.summary.totalBlocks).toBe(3);
      expect(parsed.blockCounts).toHaveLength(2);
    });
  });
});
