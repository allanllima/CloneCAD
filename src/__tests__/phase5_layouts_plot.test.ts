import { describe, it, expect, beforeEach } from 'vitest';
import { LayoutManager } from '../core/layout/LayoutManager';
import { PlotStyleManager } from '../core/layout/PlotStyleManager';
import { PDFPlotter } from '../core/layout/PDFPlotter';
import {
  CADLayout,
  LayoutViewport,
  PlotConfig,
  STANDARD_PAPER_SIZES,
  STANDARD_SCALES,
  getDefaultMarginsForPaper,
} from '../core/layout/LayoutTypes';
import { CADEntity, CADLayer, LineEntity, CircleEntity, RectangleEntity } from '../core/types';

describe('Fase 5: Layouts, Viewports, Escalas Técnicas & Plotagem Vetorial (Paper Space)', () => {
  let layoutManager: LayoutManager;
  let plotStyleManager: PlotStyleManager;
  let pdfPlotter: PDFPlotter;

  beforeEach(() => {
    plotStyleManager = new PlotStyleManager();
    layoutManager = new LayoutManager();
    pdfPlotter = new PDFPlotter(layoutManager, plotStyleManager);
  });

  describe('LayoutManager & Formatos de Folha Normalizados (ABNT/ISO)', () => {
    it('deve carregar layouts padrão de prancha (A1 e A3) na inicialização', () => {
      const layouts = layoutManager.getAllLayouts();
      expect(layouts.length).toBeGreaterThanOrEqual(2);

      const layout1 = layoutManager.getLayout('layout_1');
      expect(layout1).toBeDefined();
      expect(layout1!.paperSize).toBe('A1');
      expect(layout1!.orientation).toBe('landscape');
      expect(layout1!.viewports.length).toBeGreaterThan(0);

      const layout2 = layoutManager.getLayout('layout_2');
      expect(layout2).toBeDefined();
      expect(layout2!.paperSize).toBe('A3');
    });

    it('deve calcular corretamente as dimensões de folha A0, A1, A2, A3, A4 em Paisagem e Retrato', () => {
      // A0 Paisagem: 1189 x 841 mm
      const a0Land = layoutManager.getDimensionsForPaper('A0', 'landscape');
      expect(a0Land.width).toBe(1189);
      expect(a0Land.height).toBe(841);

      // A0 Retrato: 841 x 1189 mm
      const a0Port = layoutManager.getDimensionsForPaper('A0', 'portrait');
      expect(a0Port.width).toBe(841);
      expect(a0Port.height).toBe(1189);

      // A1 Paisagem: 841 x 594 mm
      const a1Land = layoutManager.getDimensionsForPaper('A1', 'landscape');
      expect(a1Land.width).toBe(841);
      expect(a1Land.height).toBe(594);

      // A4 Retrato: 210 x 297 mm
      const a4Port = layoutManager.getDimensionsForPaper('A4', 'portrait');
      expect(a4Port.width).toBe(210);
      expect(a4Port.height).toBe(297);
    });

    it('deve aplicar margens normalizadas ABNT NBR 10068 (margem esquerda de encadernação 25mm)', () => {
      const marginsA1 = getDefaultMarginsForPaper('A1');
      expect(marginsA1.left).toBe(25);
      expect(marginsA1.top).toBe(10);
      expect(marginsA1.right).toBe(10);
      expect(marginsA1.bottom).toBe(10);

      const marginsA3 = getDefaultMarginsForPaper('A3');
      expect(marginsA3.left).toBe(25);
      expect(marginsA3.top).toBe(7);
      expect(marginsA3.right).toBe(7);
      expect(marginsA3.bottom).toBe(7);
    });

    it('deve criar, atualizar, renomear e excluir pranchas técnicas', () => {
      const initialCount = layoutManager.getAllLayouts().length;

      const created = layoutManager.createLayout({
        name: 'Prancha 03 - Estrutural',
        paperSize: 'A2',
        orientation: 'landscape',
      });
      expect(created.id).toBeDefined();
      expect(created.paperSize).toBe('A2');
      expect(layoutManager.getAllLayouts().length).toBe(initialCount + 1);

      // Renomear
      layoutManager.updateLayout(created.id, { name: 'Prancha 03 - Formas' });
      expect(layoutManager.getLayout(created.id)!.name).toBe('Prancha 03 - Formas');

      // Excluir
      const deleted = layoutManager.deleteLayout(created.id);
      expect(deleted).toBe(true);
      expect(layoutManager.getLayout(created.id)).toBeUndefined();
    });

    it('deve alternar entre Model Space e Paper Space', () => {
      expect(layoutManager.getActiveSpace()).toBe('model');
      expect(layoutManager.isModelSpace()).toBe(true);

      layoutManager.setActiveSpace('layout_1');
      expect(layoutManager.getActiveSpace()).toBe('layout_1');
      expect(layoutManager.isModelSpace()).toBe(false);
      expect(layoutManager.getActiveLayout()?.id).toBe('layout_1');

      layoutManager.setActiveSpace('model');
      expect(layoutManager.getActiveSpace()).toBe('model');
      expect(layoutManager.isModelSpace()).toBe(true);
    });
  });

  describe('Viewports Flutuantes (MVIEW, Escalas Técnicas & VP Freeze)', () => {
    it('deve adicionar viewport e converter coordenadas entre Paper Space (mm) e Model Space', () => {
      const vp: Omit<LayoutViewport, 'id'> = {
        x: 100, // canto na folha
        y: 100,
        width: 400,
        height: 300,
        viewCenter: { x: 500, y: 500 }, // centro no modelo
        scale: 0.02, // 1:50 (1 unid modelo = 0.02 mm na folha, ou 50 unid modelo = 1 mm papel)
        scaleName: '1:50',
        rotation: 0,
        frozenLayers: [],
        locked: false,
      };

      const added = layoutManager.addViewport('layout_1', vp);
      expect(added).not.toBeNull();
      const vpId = added!.id;

      // Centro da viewport na folha em mm:
      // x: 100 + 400 / 2 = 300 mm
      // y: 100 + 300 / 2 = 250 mm
      const paperCenter = layoutManager.getViewportPaperCenter(added!);
      expect(paperCenter.x).toBe(300);
      expect(paperCenter.y).toBe(250);

      // Ponto no centro do modelo deve mapear exatamente para o centro do viewport no papel
      const paperPt = layoutManager.modelToPaper(added!, { x: 500, y: 500 });
      expect(paperPt.x).toBeCloseTo(300, 2);
      expect(paperPt.y).toBeCloseTo(250, 2);

      // Ponto 50 unidades à direita no modelo (+50 unidades a escala 1:50 = +1mm no papel)
      const paperPtOffset = layoutManager.modelToPaper(added!, { x: 550, y: 500 });
      expect(paperPtOffset.x).toBeCloseTo(301, 2);

      // Transformação inversa: do papel para o modelo
      const modelPt = layoutManager.paperToModel(added!, paperCenter);
      expect(modelPt.x).toBeCloseTo(500, 2);
      expect(modelPt.y).toBeCloseTo(500, 2);
    });

    it('deve gerenciar congelamento de camadas por Viewport (VP Freeze)', () => {
      const layout = layoutManager.getLayout('layout_1')!;
      const vp = layout.viewports[0];

      // Inicialmente visível
      expect(layoutManager.isLayerVisibleInViewport(vp, 'electrical')).toBe(true);

      // Congelar camada 'electrical' apenas nesta viewport
      layoutManager.setVPFreeze('layout_1', vp.id, 'electrical', true);
      const updatedVp = layoutManager.getLayout('layout_1')!.viewports[0];
      expect(layoutManager.isLayerVisibleInViewport(updatedVp, 'electrical')).toBe(false);

      // Descongelar camada
      layoutManager.setVPFreeze('layout_1', vp.id, 'electrical', false);
      const restoredVp = layoutManager.getLayout('layout_1')!.viewports[0];
      expect(layoutManager.isLayerVisibleInViewport(restoredVp, 'electrical')).toBe(true);
    });

    it('deve calcular corretamente a caixa de enquadramento do Model Space (Model Framing Bounds)', () => {
      const vp: LayoutViewport = {
        id: 'vp_test',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        viewCenter: { x: 0, y: 0 },
        scale: 0.01, // 1:100 -> halfW = 100 / 0.01 = 10000 unidades
        scaleName: '1:100',
        rotation: 0,
        frozenLayers: [],
        locked: false,
      };

      const bounds = layoutManager.getModelFramingBounds(vp);
      expect(bounds.minX).toBe(-10000);
      expect(bounds.maxX).toBe(10000);
      expect(bounds.minY).toBe(-5000);
      expect(bounds.maxY).toBe(5000);
    });
  });

  describe('PlotStyleManager (Tabelas de Estilo de Plotagem CTB)', () => {
    it('deve carregar tabelas de plotagem padrão (Monochrome, Grayscale, ACAD, Architectural)', () => {
      const tables = plotStyleManager.getTables();
      expect(tables.length).toBeGreaterThanOrEqual(4);

      expect(plotStyleManager.getTable('monochrome.ctb')).toBeDefined();
      expect(plotStyleManager.getTable('grayscale.ctb')).toBeDefined();
      expect(plotStyleManager.getTable('acad.ctb')).toBeDefined();
      expect(plotStyleManager.getTable('architectural.ctb')).toBeDefined();
    });

    it('deve mapear todas as cores para preto (#000000) em Monochrome.ctb', () => {
      const penRed = plotStyleManager.resolvePenStyle('monochrome.ctb', '#ff0000', '0');
      expect(penRed.color).toBe('#000000');

      const penCyan = plotStyleManager.resolvePenStyle('monochrome.ctb', '#00e5ff', 'custom_layer');
      expect(penCyan.color).toBe('#000000');
    });

    it('deve aplicar hierarquia de penas executivas em Architectural.ctb (Paredes grossas, cotas finas)', () => {
      // Paredes: pena espessa (0.70mm)
      const wallPen = plotStyleManager.resolvePenStyle('architectural.ctb', '#00e5ff', 'walls');
      expect(wallPen.color).toBe('#000000');
      expect(wallPen.lineWeight).toBe(0.70);

      // Portas: pena média (0.35mm)
      const doorPen = plotStyleManager.resolvePenStyle('architectural.ctb', '#ffff00', 'doors');
      expect(doorPen.lineWeight).toBe(0.35);

      // Cotas / Dimensões: pena fina (0.18mm)
      const dimPen = plotStyleManager.resolvePenStyle('architectural.ctb', '#ffffff', 'dimensions');
      expect(dimPen.lineWeight).toBe(0.18);

      // Hachuras: pena ultrafina (0.09mm)
      const hatchPen = plotStyleManager.resolvePenStyle('architectural.ctb', '#888888', 'hatch');
      expect(hatchPen.lineWeight).toBe(0.09);
    });

    it('deve calcular luminância óptica correta para tons de cinza em Grayscale.ctb', () => {
      const whiteGray = plotStyleManager.rgbToGrayscale('#ffffff');
      expect(whiteGray.toLowerCase()).toBe('#ffffff');

      const blackGray = plotStyleManager.rgbToGrayscale('#000000');
      expect(blackGray.toLowerCase()).toBe('#000000');

      const pureRedGray = plotStyleManager.rgbToGrayscale('#ff0000');
      // 0.299 * 255 = ~76 (hex 4c)
      expect(pureRedGray).toBe('#4c4c4c');
    });
  });

  describe('PDFPlotter & Exportação Vetorial (jsPDF & SVG)', () => {
    const mockLayers: CADLayer[] = [
      { id: '0', name: '0', color: '#ffffff', visible: true, locked: false },
      { id: 'walls', name: 'PAREDES', color: '#00e5ff', visible: true, locked: false },
      { id: 'dimensions', name: 'COTAS', color: '#e5c07b', visible: true, locked: false },
    ];

    const mockEntities: CADEntity[] = [
      { id: 'l1', type: 'line', layerId: 'walls', start: { x: 0, y: 0 }, end: { x: 500, y: 0 }, visible: true } as LineEntity,
      { id: 'l2', type: 'line', layerId: 'walls', start: { x: 500, y: 0 }, end: { x: 500, y: 300 }, visible: true } as LineEntity,
      { id: 'c1', type: 'circle', layerId: '0', center: { x: 250, y: 150 }, radius: 50, visible: true } as CircleEntity,
      { id: 'r1', type: 'rectangle', layerId: '0', origin: { x: 100, y: 50 }, width: 100, height: 100, visible: true } as RectangleEntity,
    ];

    it('deve gerar documento vetorial jsPDF para um Layout com dimensões fiéis', () => {
      const config: PlotConfig = {
        layoutId: 'layout_1',
        plotArea: 'layout',
        paperSize: 'A1',
        orientation: 'landscape',
        plotStyleTable: 'architectural.ctb',
        fitToPage: false,
        centerPlot: true,
      };

      const doc = pdfPlotter.plotToPDF(config, mockEntities, mockLayers);
      expect(doc).toBeDefined();

      // Dimensões da página no jsPDF para A1 Paisagem devem ser 841 x 594 mm
      const pageSize = doc.internal.pageSize;
      expect(pageSize.getWidth()).toBeCloseTo(841, 1);
      expect(pageSize.getHeight()).toBeCloseTo(594, 1);
    });

    it('deve gerar documento vetorial jsPDF para Model Space com limites e ajuste ao papel', () => {
      const config: PlotConfig = {
        plotArea: 'extents',
        paperSize: 'A3',
        orientation: 'landscape',
        plotStyleTable: 'monochrome.ctb',
        fitToPage: true,
        centerPlot: true,
      };

      const doc = pdfPlotter.plotToPDF(config, mockEntities, mockLayers);
      expect(doc).toBeDefined();

      const pageSize = doc.internal.pageSize;
      expect(pageSize.getWidth()).toBeCloseTo(420, 1);
      expect(pageSize.getHeight()).toBeCloseTo(297, 1);
    });

    it('deve gerar representação vetorial SVG correspondente à folha com elementos gráficos', () => {
      const config: PlotConfig = {
        layoutId: 'layout_1',
        plotArea: 'layout',
        paperSize: 'A1',
        orientation: 'landscape',
        plotStyleTable: 'architectural.ctb',
        fitToPage: false,
        centerPlot: true,
      };

      const svg = pdfPlotter.generateSVG(config, mockEntities, mockLayers);
      expect(svg).toBeDefined();
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 841 594"');
      expect(svg).toContain('</svg>');
      // Deve conter os limites da folha e das viewports
      expect(svg).toContain('Viewport vp_1');
    });
  });
});
