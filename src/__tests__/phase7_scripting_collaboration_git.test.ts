import { describe, it, expect, beforeEach } from 'vitest';
import { CADCore } from '../core/CADCore';
import { AutoLISPInterpreter } from '../core/scripting/AutoLISPInterpreter';
import { ScriptEngine } from '../core/scripting/ScriptEngine';
import { CADDiffEngine } from '../core/vcs/CADDiffEngine';
import { VersionControlManager } from '../core/vcs/VersionControlManager';
import { CollaborationManager } from '../core/collaboration/CollaborationManager';
import {
  LineEntity,
  CircleEntity,
  RectangleEntity,
  TextEntity,
} from '../core/types';

describe('Phase 7: Extensibility, Scripting APIs & Cloud Collaboration', () => {
  let core: CADCore;

  beforeEach(() => {
    core = new CADCore(800, 600);
  });

  // ---------------------------------------------------------------------------
  // 1. AutoLISP Interpreter
  // ---------------------------------------------------------------------------
  describe('AutoLISP Interpreter', () => {
    it('evaluates basic math and expressions', () => {
      const lisp = new AutoLISPInterpreter(core);
      expect(lisp.execute('(+ 10 20 30)').result).toBe(60);
      expect(lisp.execute('(- 100 25 15)').result).toBe(60);
      expect(lisp.execute('(* 2 3 4)').result).toBe(24);
      expect(lisp.execute('(/ 100 4)').result).toBe(25);
      expect(lisp.execute('(sqrt 64)').result).toBe(8);
      expect(lisp.execute('(abs -42)').result).toBe(42);
    });

    it('handles variable assignment with setq and retrieval', () => {
      const lisp = new AutoLISPInterpreter(core);
      lisp.execute('(setq raio 25 largura 100)');
      expect(lisp.execute('raio').result).toBe(25);
      expect(lisp.execute('largura').result).toBe(100);
      expect(lisp.execute('(+ raio largura)').result).toBe(125);
    });

    it('defines custom functions with defun and executes them', () => {
      const lisp = new AutoLISPInterpreter(core);
      lisp.execute('(defun somar (a b) (+ a b))');
      const res = lisp.execute('(somar 35 15)');
      expect(res.result).toBe(50);
    });

    it('evaluates conditionals and logic (if, =, <, >)', () => {
      const lisp = new AutoLISPInterpreter(core);
      expect(lisp.execute('(if (= 10 10) "igual" "diferente")').result).toBe('igual');
      expect(lisp.execute('(if (< 10 5) "menor" "maior")').result).toBe('maior');
    });

    it('executes CAD drawing commands (LINE, CIRCLE, RECTANGLE) into Core', () => {
      const lisp = new AutoLISPInterpreter(core);
      expect(core.getEntities().length).toBe(0);

      lisp.execute('(command "LINE" (list 0 0) (list 100 50) "")');
      lisp.execute('(command "CIRCLE" (list 50 50) 25)');
      lisp.execute('(command "RECTANGLE" (list 10 10) (list 60 40))');

      const ents = core.getEntities();
      expect(ents.length).toBe(3);

      const line = ents.find((e) => e.type === 'line') as LineEntity;
      expect(line).toBeDefined();
      expect(line.start.x).toBe(0);
      expect(line.end.x).toBe(100);

      const circle = ents.find((e) => e.type === 'circle') as CircleEntity;
      expect(circle).toBeDefined();
      expect(circle.center.x).toBe(50);
      expect(circle.radius).toBe(25);

      const rect = ents.find((e) => e.type === 'rectangle') as RectangleEntity;
      expect(rect).toBeDefined();
      expect(rect.width).toBe(50);
      expect(rect.height).toBe(30);
    });

    it('ignores AutoLISP comments correctly', () => {
      const lisp = new AutoLISPInterpreter(core);
      const code = `
        ; Comentario inicial
        (setq x 10) ; define x
        ; outro comentario
        (+ x 5)
      `;
      expect(lisp.execute(code).result).toBe(15);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. JavaScript / TypeScript Scripting Engine
  // ---------------------------------------------------------------------------
  describe('JavaScript Scripting Engine', () => {
    it('executes arbitrary JavaScript manipulating the CAD scene', () => {
      const engine = new ScriptEngine(core);
      const script = `
        console.log("Criando pilares...");
        cad.addLine({ x: 0, y: 0 }, { x: 200, y: 0 }, '0', '#61afef');
        cad.addCircle({ x: 100, y: 100 }, 30, '0', '#e5c07b');
        cad.addText({ x: 100, y: 150 }, "PILARES OK", 14);
        return 42;
      `;

      const res = engine.execute(script, 'javascript');
      expect(res.success).toBe(true);
      expect(res.result).toBe(42);
      expect(res.output).toContain('Criando pilares...');

      const ents = core.getEntities();
      expect(ents.length).toBe(3);
      expect(ents.some((e) => e.type === 'line')).toBe(true);
      expect(ents.some((e) => e.type === 'circle')).toBe(true);
      expect(ents.some((e) => e.type === 'text')).toBe(true);
    });

    it('captures console.warn and console.error messages', () => {
      const engine = new ScriptEngine(core);
      const script = `
        console.warn("Aviso de cota");
        console.error("Erro simulado");
      `;
      const res = engine.execute(script);
      expect(res.success).toBe(true);
      expect(res.output.some((o) => o.includes('[WARN] Aviso de cota'))).toBe(true);
      expect(res.output.some((o) => o.includes('[ERROR] Erro simulado'))).toBe(true);
    });

    it('handles script syntax/runtime errors gracefully without crashing CADCore', () => {
      const engine = new ScriptEngine(core);
      const script = `
        const a = undefinedVariable.doSomething();
      `;
      const res = engine.execute(script);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.output.some((o) => o.includes('[ERROR]'))).toBe(true);
    });

    it('provides productivity templates (Structural Grid, Spiral, etc.)', () => {
      const templates = core.getScriptTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(3);
      expect(templates.some((t) => t.id === 'structural_grid')).toBe(true);
      expect(templates.some((t) => t.id === 'archimedean_spiral')).toBe(true);
      expect(templates.some((t) => t.id === 'autolisp_grid')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Version Control (Git for CAD) & Revision History
  // ---------------------------------------------------------------------------
  describe('Version Control & Branching (Git for CAD)', () => {
    it('creates immutable commits snapshotting entity and layer state', () => {
      const vcs = core.getVersionControlManager();

      // Add entities
      core.addEntity({
        id: 'l1',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        visible: true,
      });

      const commit1 = core.commitDrawing('Versão inicial das paredes', 'Allan');
      expect(commit1.id).toBeDefined();
      expect(commit1.message).toBe('Versão inicial das paredes');
      expect(commit1.author).toBe('Allan');
      expect(commit1.entities.length).toBe(1);

      // Add more entities
      core.addEntity({
        id: 'c1',
        type: 'circle',
        layerId: '0',
        center: { x: 50, y: 50 },
        radius: 20,
        visible: true,
      });

      const commit2 = core.commitDrawing('Adicionado pilar circular', 'Allan');
      expect(commit2.entities.length).toBe(2);

      const commits = core.getCommits();
      expect(commits.length).toBe(2);
      expect(commits[0].id).toBe(commit2.id); // sorted desc
    });

    it('supports branch creation and switching', () => {
      expect(core.getCurrentBranch()).toBe('main');

      const created = core.createBranch('eletrica-revisao-1');
      expect(created).toBe(true);
      expect(core.getBranches()).toContain('eletrica-revisao-1');

      const switched = core.checkoutBranch('eletrica-revisao-1');
      expect(switched).toBe(true);
      expect(core.getCurrentBranch()).toBe('eletrica-revisao-1');
    });

    it('rolls back CAD scene to previous commit state accurately', () => {
      // 1. Initial commit with 1 entity
      core.addEntity({
        id: 'wall_1',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 50, y: 50 },
        visible: true,
      });
      const c1 = core.commitDrawing('Commit 1: apenas 1 parede');

      // 2. Add 2 more entities
      core.addEntity({
        id: 'wall_2',
        type: 'line',
        layerId: '0',
        start: { x: 50, y: 50 },
        end: { x: 100, y: 50 },
        visible: true,
      });
      core.addEntity({
        id: 'circ_1',
        type: 'circle',
        layerId: '0',
        center: { x: 100, y: 50 },
        radius: 10,
        visible: true,
      });
      core.commitDrawing('Commit 2: 3 entidades no total');
      expect(core.getEntities().length).toBe(3);

      // 3. Rollback to Commit 1
      const rolledBack = core.checkoutCommit(c1.id);
      expect(rolledBack).toBe(true);
      expect(core.getEntities().length).toBe(1);
      expect(core.getEntity('wall_1')).toBeDefined();
      expect(core.getEntity('wall_2')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. CAD Visual Diff Engine
  // ---------------------------------------------------------------------------
  describe('CAD Visual Diff Engine', () => {
    it('detects added, deleted, modified, and unchanged entities', () => {
      const before: LineEntity[] = [
        { id: '1', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 10, y: 10 }, visible: true },
        { id: '2', type: 'line', layerId: '0', start: { x: 10, y: 10 }, end: { x: 20, y: 20 }, visible: true },
        { id: '3', type: 'line', layerId: '0', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, visible: true },
      ];

      const after = [
        // '1' is unchanged
        { id: '1', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 10, y: 10 }, visible: true },
        // '2' is modified (end point moved)
        { id: '2', type: 'line', layerId: '0', start: { x: 10, y: 10 }, end: { x: 25, y: 25 }, visible: true },
        // '3' was deleted (omitted)
        // '4' is added
        { id: '4', type: 'circle', layerId: '0', center: { x: 50, y: 50 }, radius: 15, visible: true },
      ];

      const diff = CADDiffEngine.diff(before, after as any);

      expect(diff.summary.unchangedCount).toBe(1);
      expect(diff.summary.modifiedCount).toBe(1);
      expect(diff.summary.deletedCount).toBe(1);
      expect(diff.summary.addedCount).toBe(1);

      expect(diff.added[0].id).toBe('4');
      expect(diff.deleted[0].id).toBe('3');
      expect(diff.modified[0].before.id).toBe('2');
      expect(diff.modified[0].changes.length).toBeGreaterThan(0);
    });

    it('integrates diffCurrentWithCommit in CADCore', () => {
      core.addEntity({
        id: 'line_base',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        visible: true,
      });
      const c1 = core.commitDrawing('Base layout');

      // Now modify the line and add a circle
      const line = core.getEntity('line_base') as LineEntity;
      core.updateEntity({ ...line, end: { x: 200, y: 200 } });
      core.addEntity({
        id: 'new_circle',
        type: 'circle',
        layerId: '0',
        center: { x: 50, y: 50 },
        radius: 20,
        visible: true,
      });

      const diff = core.diffCurrentWithCommit(c1.id);
      expect(diff.summary.modifiedCount).toBe(1);
      expect(diff.summary.addedCount).toBe(1);
      expect(diff.summary.deletedCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Real-Time Collaboration
  // ---------------------------------------------------------------------------
  describe('Real-Time Collaboration Manager', () => {
    it('manages local presence and session room connection', () => {
      const collab = core.getCollaborationManager();
      expect(collab.isConnected()).toBe(false);

      core.joinCollaborationRoom('sala-equipe-1', 'Allan Arquiteto');
      expect(collab.isConnected()).toBe(true);
      expect(collab.getRoomId()).toBe('sala-equipe-1');
      expect(collab.getLocalUser().name).toBe('Allan Arquiteto');

      core.leaveCollaborationRoom();
      expect(collab.isConnected()).toBe(false);
      expect(collab.getRoomId()).toBeNull();
    });

    it('broadcasts cursor coordinates and active tool', () => {
      const collab = core.getCollaborationManager();
      core.joinCollaborationRoom('sala-cursor-test');

      collab.broadcastCursor({ x: 150, y: 250 }, 'circle');
      const local = collab.getLocalUser();
      expect(local.cursor).toEqual({ x: 150, y: 250 });
      expect(local.activeTool).toBe('circle');

      core.leaveCollaborationRoom();
    });
  });
});
