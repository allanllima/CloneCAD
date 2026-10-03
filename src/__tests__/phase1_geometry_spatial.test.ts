import { describe, it, expect } from 'vitest';
import { RTree2D } from '../core/spatial/RTree';
import { BulgeUtils } from '../core/geometry/BulgeUtils';
import { SplineUtils } from '../core/geometry/SplineUtils';
import { EllipseUtils } from '../core/geometry/EllipseUtils';
import { HatchUtils } from '../core/geometry/HatchUtils';
import { PolygonBooleanUtils } from '../core/geometry/PolygonBooleanUtils';

describe('Fase 1: Motor Geométrico & Indexação Espacial R-Tree 2D', () => {
  describe('RTree2D Spatial Indexing', () => {
    it('deve inserir, consultar por ponto e por caixa delimitadora', () => {
      const tree = new RTree2D();
      tree.insert('ent_1', { minX: 0, maxX: 10, minY: 0, maxY: 10 });
      tree.insert('ent_2', { minX: 20, maxX: 30, minY: 20, maxY: 30 });
      tree.insert('ent_3', { minX: 5, maxX: 15, minY: 5, maxY: 15 });

      // Busca por ponto em (5, 5) com tolerância 1
      const hitsPoint = tree.searchPoint({ x: 5, y: 5 }, 1);
      expect(hitsPoint).toContain('ent_1');
      expect(hitsPoint).toContain('ent_3');
      expect(hitsPoint).not.toContain('ent_2');

      // Busca por caixa (0, 0) a (12, 12)
      const hitsBox = tree.searchBox({ minX: 0, maxX: 12, minY: 0, maxY: 12 });
      expect(hitsBox).toContain('ent_1');
      expect(hitsBox).toContain('ent_3');
      expect(hitsBox).not.toContain('ent_2');
    });

    it('deve remover entidade e limpar o índice', () => {
      const tree = new RTree2D();
      tree.insert('ent_1', { minX: 0, maxX: 10, minY: 0, maxY: 10 });
      expect(tree.searchPoint({ x: 5, y: 5 }, 1)).toContain('ent_1');

      tree.remove('ent_1');
      expect(tree.searchPoint({ x: 5, y: 5 }, 1)).toHaveLength(0);

      tree.insert('ent_2', { minX: 0, maxX: 10, minY: 0, maxY: 10 });
      tree.clear();
      expect(tree.searchPoint({ x: 5, y: 5 }, 1)).toHaveLength(0);
    });
  });

  describe('BulgeUtils (Polilinhas com Arcos)', () => {
    it('deve converter bulge positivo para arco no sentido anti-horário', () => {
      // Bulge = 1 representa um semicírculo de 180 graus
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 0 };
      const bulge = 1;

      const arc = BulgeUtils.toArc(p1, p2, bulge);
      expect(arc).not.toBeNull();
      expect(arc!.radius).toBeCloseTo(5, 4);
      expect(arc!.center.x).toBeCloseTo(5, 4);
      expect(arc!.center.y).toBeCloseTo(0, 4);
    });

    it('deve amostrar pontos ao longo do arco definido pelo bulge', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 0 };
      const sampled = BulgeUtils.samplePoints(p1, p2, 1, 8);
      expect(sampled.length).toBe(9);
      expect(sampled[0].x).toBeCloseTo(p1.x, 5);
      expect(sampled[0].y).toBeCloseTo(p1.y, 5);
      expect(sampled[sampled.length - 1].x).toBeCloseTo(p2.x, 5);
      expect(sampled[sampled.length - 1].y).toBeCloseTo(p2.y, 5);
    });
  });

  describe('SplineUtils (Curvas Catmull-Rom)', () => {
    it('deve interpolar pontos e calcular caixa delimitadora', () => {
      const ctrl = [
        { x: 0, y: 0 },
        { x: 10, y: 20 },
        { x: 20, y: 0 },
        { x: 30, y: 15 },
      ];

      const sampled = SplineUtils.sampleSpline(ctrl, false, 10);
      expect(sampled.length).toBeGreaterThan(ctrl.length);

      const bounds = SplineUtils.getBounds(ctrl, false);
      expect(bounds.minX).toBe(0);
      expect(bounds.maxX).toBe(30);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(20);
    });

    it('deve calcular distância de ponto até a spline', () => {
      const ctrl = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 0 },
      ];
      const dist = SplineUtils.distanceToSpline({ x: 10, y: 10 }, ctrl);
      expect(dist).toBeCloseTo(0, 1);
    });
  });

  describe('EllipseUtils (Elipses Paramétricas)', () => {
    it('deve amostrar pontos e calcular limites da elipse', () => {
      const center = { x: 50, y: 50 };
      const rx = 20;
      const ry = 10;
      const rotation = 0;

      const bounds = EllipseUtils.getBounds(center, rx, ry, rotation);
      expect(bounds.minX).toBe(30);
      expect(bounds.maxX).toBe(70);
      expect(bounds.minY).toBe(40);
      expect(bounds.maxY).toBe(60);

      const sampled = EllipseUtils.sampleEllipse(center, rx, ry, rotation, 0, Math.PI * 2, 32);
      expect(sampled.length).toBe(33);
    });

    it('deve calcular distância de ponto até o perímetro da elipse', () => {
      const center = { x: 0, y: 0 };
      const dist = EllipseUtils.distanceToEllipse({ x: 25, y: 0 }, center, 20, 10, 0);
      expect(dist).toBeCloseTo(5, 1);
    });
  });

  describe('HatchUtils (Hachuras Paramétricas ANSI & Grid)', () => {
    it('deve gerar linhas de hachura para padrões ANSI31 e GRID', () => {
      const poly = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
        { x: 0, y: 50 },
      ];

      const linesAnsi = HatchUtils.generatePatternLines(poly, 'ANSI31', 10, Math.PI / 4);
      expect(linesAnsi.length).toBeGreaterThan(0);

      const linesGrid = HatchUtils.generatePatternLines(poly, 'GRID', 10, 0);
      expect(linesGrid.length).toBeGreaterThan(linesAnsi.length);
    });
  });

  describe('PolygonBooleanUtils (Área, Centroide e Triangulação)', () => {
    it('deve calcular área e centroide de polígono', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];

      const area = PolygonBooleanUtils.calculateArea(square);
      expect(area).toBeCloseTo(100, 4);

      const centroid = PolygonBooleanUtils.calculateCentroid(square);
      expect(centroid.x).toBeCloseTo(5, 4);
      expect(centroid.y).toBeCloseTo(5, 4);
    });

    it('deve testar ponto dentro de polígono (Point in Polygon)', () => {
      const poly = [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
        { x: 0, y: 20 },
      ];

      expect(PolygonBooleanUtils.isPointInPolygon({ x: 10, y: 10 }, poly)).toBe(true);
      expect(PolygonBooleanUtils.isPointInPolygon({ x: 30, y: 10 }, poly)).toBe(false);
    });

    it('deve triangular polígono com Ear Clipping', () => {
      const poly = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];

      const indices = PolygonBooleanUtils.triangulate(poly);
      // Quadrado gera 2 triângulos = 6 índices
      expect(indices.length).toBe(6);
    });
  });
});
