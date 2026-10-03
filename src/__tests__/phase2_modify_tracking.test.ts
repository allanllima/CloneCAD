import { describe, it, expect, beforeEach } from 'vitest';
import { CADCore } from '../core/CADCore';
import { LineEntity, CircleEntity, RectangleEntity } from '../core/types';
import { AddEntityCommand } from '../commands/AddEntityCommand';
import { DeleteEntityCommand } from '../commands/DeleteEntityCommand';
import { ModifyEntityCommand } from '../commands/ModifyEntityCommand';
import { CompositeCommand } from '../commands/CompositeCommand';
import { IntersectionUtils } from '../core/geometry/IntersectionUtils';
import { TrackingEngine } from '../core/TrackingEngine';

describe('Fase 2: Comandos de Modificação Avançados & Tracking de Precisão', () => {
  let core: CADCore;

  beforeEach(() => {
    core = new CADCore(1000, 800);
  });

  describe('Command Pattern & Undo / Redo Stack', () => {
    it('deve adicionar entidade e desfazer/refazer via comandos', () => {
      const line: LineEntity = {
        id: 'line_test_1',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        visible: true,
      };

      const addCmd = new AddEntityCommand(core, line);
      core.executeCommand(addCmd);

      expect(core.getEntity('line_test_1')).toBeDefined();
      expect(core.canUndo()).toBe(true);

      // Undo
      core.undo();
      expect(core.getEntity('line_test_1')).toBeUndefined();
      expect(core.canRedo()).toBe(true);

      // Redo
      core.redo();
      expect(core.getEntity('line_test_1')).toBeDefined();
    });

    it('deve deletar entidade com suporte a Undo', () => {
      const circle: CircleEntity = {
        id: 'circle_test_1',
        type: 'circle',
        layerId: '0',
        center: { x: 50, y: 50 },
        radius: 25,
        visible: true,
      };

      core.addEntity(circle);
      expect(core.getEntity('circle_test_1')).toBeDefined();

      const delCmd = new DeleteEntityCommand(core, circle);
      core.executeCommand(delCmd);
      expect(core.getEntity('circle_test_1')).toBeUndefined();

      core.undo();
      expect(core.getEntity('circle_test_1')).toBeDefined();
    });

    it('deve modificar entidade via ModifyEntityCommand com rollback', () => {
      const line: LineEntity = {
        id: 'line_mod',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 50, y: 0 },
        visible: true,
      };
      core.addEntity(line);

      const modified: LineEntity = {
        ...line,
        end: { x: 100, y: 0 },
      };

      const modCmd = new ModifyEntityCommand(core, line, modified);
      core.executeCommand(modCmd);

      expect((core.getEntity('line_mod') as LineEntity).end.x).toBe(100);

      core.undo();
      expect((core.getEntity('line_mod') as LineEntity).end.x).toBe(50);
    });

    it('deve executar operações em lote com CompositeCommand atomicamente', () => {
      const l1: LineEntity = { id: 'l1', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, visible: true };
      const l2: LineEntity = { id: 'l2', type: 'line', layerId: '0', start: { x: 10, y: 0 }, end: { x: 20, y: 0 }, visible: true };

      const cmd1 = new AddEntityCommand(core, l1);
      const cmd2 = new AddEntityCommand(core, l2);
      const composite = new CompositeCommand([cmd1, cmd2], 'BATCH ADD');

      core.executeCommand(composite);
      expect(core.getEntity('l1')).toBeDefined();
      expect(core.getEntity('l2')).toBeDefined();

      core.undo();
      expect(core.getEntity('l1')).toBeUndefined();
      expect(core.getEntity('l2')).toBeUndefined();
    });
  });

  describe('IntersectionUtils (Interseções para Trim, Extend e Fillet)', () => {
    it('deve encontrar interseção entre dois segmentos de reta concorrentes', () => {
      const seg1 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } };
      const seg2 = { start: { x: 5, y: 0 }, end: { x: 5, y: 10 } };

      const pt = IntersectionUtils.lineSegmentIntersection(seg1.start, seg1.end, seg2.start, seg2.end);
      expect(pt).not.toBeNull();
      expect(pt!.x).toBeCloseTo(5, 4);
      expect(pt!.y).toBeCloseTo(5, 4);
    });

    it('deve retornar null para linhas paralelas', () => {
      const seg1 = { start: { x: 0, y: 0 }, end: { x: 10, y: 0 } };
      const seg2 = { start: { x: 0, y: 5 }, end: { x: 10, y: 5 } };

      const pt = IntersectionUtils.lineSegmentIntersection(seg1.start, seg1.end, seg2.start, seg2.end);
      expect(pt).toBeNull();
    });

    it('deve encontrar interseção entre linha e círculo', () => {
      const center = { x: 10, y: 10 };
      const radius = 5;
      const p1 = { x: 0, y: 10 };
      const p2 = { x: 20, y: 10 };

      const hits = IntersectionUtils.lineCircleIntersection(p1, p2, center, radius);
      expect(hits.length).toBe(2);
      expect(hits[0].x).toBeCloseTo(5, 4);
      expect(hits[1].x).toBeCloseTo(15, 4);
    });
  });

  describe('TrackingEngine (Ortho, Polar Tracking & OTrack)', () => {
    it('deve restringir coordenadas em modo Ortho (horizontal ou vertical)', () => {
      const tracking = new TrackingEngine();
      tracking.setOrtho(true);

      const from = { x: 0, y: 0 };
      // Ponto com predominância horizontal
      const to1 = { x: 50, y: 10 };
      const ortho1 = tracking.snapOrtho(from, to1);
      expect(ortho1.y).toBe(0);
      expect(ortho1.x).toBe(50);

      // Ponto com predominância vertical
      const to2 = { x: 10, y: 80 };
      const ortho2 = tracking.snapOrtho(from, to2);
      expect(ortho2.x).toBe(0);
      expect(ortho2.y).toBe(80);
    });

    it('deve capturar ângulos de Polar Tracking (incrementos de 45° ou 30°)', () => {
      const tracking = new TrackingEngine();
      tracking.setPolarTracking(true);
      tracking.setPolarIncrement(45);

      const from = { x: 0, y: 0 };
      // Ponto próximo a 45 graus (ex: x=10, y=10.2)
      const to = { x: 10, y: 10.2 };
      const snapped = tracking.snapPolar(from, to, 5);
      expect(snapped).not.toBeNull();
      // Em 45 graus, x e y devem ser exatamente iguais
      expect(snapped!.snappedPoint.x).toBeCloseTo(snapped!.snappedPoint.y, 2);
    });
  });
});
