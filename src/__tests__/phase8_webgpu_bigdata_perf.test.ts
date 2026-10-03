import { describe, it, expect, beforeEach } from 'vitest';
import { CADCore } from '../core/CADCore';
import { FrustumCuller } from '../core/gpu/FrustumCuller';
import { LODManager } from '../core/gpu/LODManager';
import { InstancedBatchManager, BatchedLineItem } from '../core/gpu/InstancedBatchManager';
import { WebGPUManager } from '../core/gpu/WebGPUManager';
import { CADWorkerBridge } from '../core/workers/CADWorkerBridge';
import {
  LineEntity,
  CircleEntity,
  RectangleEntity,
  ArcEntity,
  EllipseEntity,
  SplineEntity,
  HatchEntity,
  TextEntity,
} from '../core/types';

describe('Phase 8: WebGPU, Dynamic LOD, Frustum Culling & Big Data CAD', () => {
  let core: CADCore;

  beforeEach(() => {
    core = new CADCore(1200, 800);
  });

  describe('1. Frustum Culler & Spatial Visibility', () => {
    it('should accurately compute 2D Axis-Aligned Bounding Box (AABB) for all CAD primitives', () => {
      const line: LineEntity = {
        id: 'l1',
        type: 'line',
        layerId: '0',
        start: { x: 10, y: 20 },
        end: { x: 100, y: 80 },
        color: '#ffffff',
      };
      const lineBox = FrustumCuller.getEntityAABB(line);
      expect(lineBox).toEqual({ minX: 10, maxX: 100, minY: 20, maxY: 80 });

      const circle: CircleEntity = {
        id: 'c1',
        type: 'circle',
        layerId: '0',
        center: { x: 50, y: 50 },
        radius: 25,
        color: '#ffffff',
      };
      const circleBox = FrustumCuller.getEntityAABB(circle);
      expect(circleBox).toEqual({ minX: 25, maxX: 75, minY: 25, maxY: 75 });

      const rect: RectangleEntity = {
        id: 'r1',
        type: 'rectangle',
        layerId: '0',
        origin: { x: 0, y: 0 },
        width: 60,
        height: 40,
        color: '#ffffff',
      };
      const rectBox = FrustumCuller.getEntityAABB(rect);
      expect(rectBox).toEqual({ minX: 0, maxX: 60, minY: 0, maxY: 40 });

      const arc: ArcEntity = {
        id: 'a1',
        type: 'arc',
        layerId: '0',
        center: { x: 100, y: 100 },
        radius: 30,
        startAngle: 0,
        endAngle: Math.PI,
        color: '#ffffff',
      };
      const arcBox = FrustumCuller.getEntityAABB(arc);
      expect(arcBox).toEqual({ minX: 70, maxX: 130, minY: 70, maxY: 130 });

      const ellipse: EllipseEntity = {
        id: 'e1',
        type: 'ellipse',
        layerId: '0',
        center: { x: 0, y: 0 },
        radiusX: 50,
        radiusY: 30,
        rotation: 0,
        startAngle: 0,
        endAngle: Math.PI * 2,
        color: '#ffffff',
      };
      const ellipseBox = FrustumCuller.getEntityAABB(ellipse);
      expect(ellipseBox).toEqual({ minX: -50, maxX: 50, minY: -50, maxY: 50 });
    });

    it('should detect bounding box intersections with and without safety margin', () => {
      const box = { minX: 10, maxX: 50, minY: 10, maxY: 50 };
      const viewportInside = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
      const viewportOutside = { minX: 100, maxX: 200, minY: 100, maxY: 200 };

      expect(FrustumCuller.intersects(box, viewportInside, 0)).toBe(true);
      expect(FrustumCuller.intersects(box, viewportOutside, 0)).toBe(false);

      // Outside with 60 margin reaches box maxX=50
      expect(FrustumCuller.intersects(box, viewportOutside, 60)).toBe(true);
    });

    it('should cull out-of-view entities and report accurate culling ratios', () => {
      const entities: LineEntity[] = [
        // Inside viewport (0 to 100)
        { id: 'in1', type: 'line', layerId: '0', start: { x: 10, y: 10 }, end: { x: 20, y: 20 } },
        { id: 'in2', type: 'line', layerId: '0', start: { x: 50, y: 50 }, end: { x: 80, y: 80 } },
        // Outside viewport
        { id: 'out1', type: 'line', layerId: '0', start: { x: 500, y: 500 }, end: { x: 550, y: 550 } },
        { id: 'out2', type: 'line', layerId: '0', start: { x: -400, y: -400 }, end: { x: -350, y: -350 } },
        // Invisible entity
        { id: 'inv', type: 'line', layerId: '0', start: { x: 20, y: 20 }, end: { x: 30, y: 30 }, visible: false },
      ];

      const vp = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
      const res = FrustumCuller.cull(entities, vp, 10);

      expect(res.totalCount).toBe(5);
      expect(res.visibleCount).toBe(2);
      expect(res.culledCount).toBe(3);
      expect(res.cullingRatio).toBe(3 / 5);
      expect(res.visible.map((e) => e.id)).toEqual(['in1', 'in2']);
    });
  });

  describe('2. Dynamic Level of Detail (LOD) Engine', () => {
    it('should determine appropriate LOD level based on screen pixel size', () => {
      expect(LODManager.getLODLevel(1.5)).toBe('SUBPIXEL');
      expect(LODManager.getLODLevel(15)).toBe('LOW');
      expect(LODManager.getLODLevel(60)).toBe('MEDIUM');
      expect(LODManager.getLODLevel(250)).toBe('HIGH');
    });

    it('should scale curve tessellation segments dynamically by LOD', () => {
      expect(LODManager.getCircleSegments('SUBPIXEL')).toBe(6);
      expect(LODManager.getCircleSegments('LOW')).toBe(12);
      expect(LODManager.getCircleSegments('MEDIUM')).toBe(32);
      expect(LODManager.getCircleSegments('HIGH')).toBe(64);

      expect(LODManager.getSplineSamples('SUBPIXEL')).toBe(6);
      expect(LODManager.getSplineSamples('HIGH')).toBe(60);

      expect(LODManager.getEllipseSegments('LOW')).toBe(14);
      expect(LODManager.getEllipseSegments('HIGH')).toBe(64);
    });

    it('should cull sub-pixel text and dense hatch pattern lines to preserve frame rate', () => {
      // Font size 10 at zoom 0.1 gives 1 screen pixel -> sub-pixel noise
      expect(LODManager.shouldRenderText(10, 0.1)).toBe(false);
      // Font size 10 at zoom 1.0 gives 10 screen pixels -> readable
      expect(LODManager.shouldRenderText(10, 1.0)).toBe(true);

      expect(LODManager.shouldRenderHatchLines(10)).toBe(false);
      expect(LODManager.shouldRenderHatchLines(500)).toBe(true);
    });
  });

  describe('3. Instanced & Merged Buffer Line Batching', () => {
    it('should consolidate thousands of lines into single draw call buckets by color', () => {
      const batchManager = new InstancedBatchManager();
      const lines: BatchedLineItem[] = [];

      // Create 3,000 lines with 3 distinct colors
      const colors = [0xff0000, 0x00ff00, 0x0000ff];
      for (let i = 0; i < 3000; i++) {
        lines.push({
          start: { x: i, y: 0 },
          end: { x: i, y: 100 },
          colorHex: colors[i % 3],
        });
      }

      const group = batchManager.batchLines(lines);
      const stats = batchManager.getStats();

      // Should create exactly 3 batches (1 per color)
      expect(stats.totalBatches).toBe(3);
      expect(stats.drawCalls).toBe(3);
      expect(stats.totalVertices).toBe(6000); // 3000 lines * 2 vertices
      expect(group.children.length).toBe(3);

      batchManager.clear();
      expect(batchManager.getStats().totalBatches).toBe(0);
      expect(group.children.length).toBe(0);
    });

    it('should correctly estimate VRAM buffer memory in megabytes', () => {
      // 100,000 vertices: 100,000 * 24 bytes = 2.4 MB approx
      const mem = InstancedBatchManager.estimateMemoryMB(100000);
      expect(mem).toBeGreaterThan(2.0);
      expect(mem).toBeLessThan(2.5);
    });
  });

  describe('4. WebGPU Manager & Compute Shaders', () => {
    it('should provide singleton instance and detect GPU backend', () => {
      const gpuMgr = WebGPUManager.getInstance();
      expect(gpuMgr).toBeDefined();
      const backend = gpuMgr.getBackendType();
      expect(['WebGPU', 'WebGL2', 'WebGL']).toContain(backend);

      const adapter = gpuMgr.getAdapterDetails();
      expect(adapter).toBeDefined();
      expect(adapter.vendor).toBeTruthy();
    });

    it('should contain valid WGSL compute shader definitions for GPU culling and intersections', () => {
      const gpuMgr = WebGPUManager.getInstance();
      const cullingShader = gpuMgr.getShaderSource('culling');
      expect(cullingShader).toContain('@compute');
      expect(cullingShader).toContain('ViewportBounds');
      expect(cullingShader).toContain('workgroup_size(64)');

      const intersectShader = gpuMgr.getShaderSource('intersection');
      expect(intersectShader).toContain('@compute');
      expect(intersectShader).toContain('IntersectionResult');
      expect(intersectShader).toContain('ccw(');
    });

    it('should execute compute culling simulation with bitmask results', () => {
      const gpuMgr = WebGPUManager.getInstance();
      const boxes = [
        { minX: 10, minY: 10, maxX: 20, maxY: 20 },
        { minX: 500, minY: 500, maxX: 600, maxY: 600 },
      ];
      const vp = { minX: 0, minY: 0, maxX: 100, maxY: 100, margin: 0 };

      const bitmask = gpuMgr.computeCullSimulation(boxes, vp);
      expect(bitmask.length).toBe(2);
      expect(bitmask[0]).toBe(1); // inside
      expect(bitmask[1]).toBe(0); // outside
    });
  });

  describe('5. Web Worker Bridge & Background Computation', () => {
    it('should execute task ping without freezing thread', async () => {
      const bridge = CADWorkerBridge.getInstance();
      const pong = await bridge.postTask('ping', {});
      expect(pong).toBe('pong');
    });

    it('should generate stress entities off-thread in background with well-formed geometries', async () => {
      const bridge = CADWorkerBridge.getInstance();
      const entities = await bridge.postTask('generate_stress', {
        count: 50,
        areaSize: 1000,
        entityType: 'mixed',
      });

      expect(entities.length).toBe(50);
      expect(entities[0].id).toContain('stress_');
      expect(['line', 'circle', 'rectangle']).toContain(entities[0].type);
    });
  });

  describe('6. CADCore Phase 8 Integration & Telemetry', () => {
    it('should configure graphics options and emit perf:options_changed event', () => {
      let emittedOpts: any = null;
      core.on('perf:options_changed', (opts) => {
        emittedOpts = opts;
      });

      core.setGraphicsOptions({
        frustumCullingEnabled: false,
        cullingMargin: 80,
      });

      const opts = core.getGraphicsOptions();
      expect(opts.frustumCullingEnabled).toBe(false);
      expect(emittedOpts.frustumCullingEnabled).toBe(false);
      expect(emittedOpts.cullingMargin).toBe(80);
    });

    it('should generate Big Data stress entities and clear them without affecting standard drawing', () => {
      // Add standard drawing entity
      core.addEntity({
        id: 'base_line',
        type: 'line',
        layerId: '0',
        start: { x: 0, y: 0 },
        end: { x: 50, y: 50 },
      } as any);

      expect(core.getEntities().length).toBe(1);

      // Generate 1,000 stress entities
      const count = core.generateStressEntities(1000, 2000, 'mixed');
      expect(count).toBe(1000);
      expect(core.getEntities().length).toBe(1001);

      // Clear stress entities
      core.clearStressEntities();
      expect(core.getEntities().length).toBe(1);
      expect(core.getEntityById('base_line')).toBeDefined();
    });

    it('should toggle performance HUD and report visibility state', () => {
      expect(core.isPerformanceHUDVisible()).toBe(false);

      let eventHUDState: boolean | null = null;
      core.on('perf:toggle_hud', (visible) => {
        eventHUDState = visible;
      });

      core.togglePerformanceHUD();
      expect(core.isPerformanceHUDVisible()).toBe(true);
      expect(eventHUDState).toBe(true);

      core.setPerformanceHUDVisible(false);
      expect(core.isPerformanceHUDVisible()).toBe(false);
      expect(eventHUDState).toBe(false);
    });

    it('should provide comprehensive PerformanceMetrics telemetry', () => {
      const metrics = core.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.fps).toBe('number');
      expect(typeof metrics.frameTimeMs).toBe('number');
      expect(typeof metrics.totalEntities).toBe('number');
      expect(typeof metrics.cullingRatio).toBe('number');
      expect(['HIGH', 'MEDIUM', 'LOW', 'SUBPIXEL']).toContain(metrics.activeLOD);
      expect(['WebGPU', 'WebGL2', 'WebGL']).toContain(metrics.rendererBackend);
    });
  });
});
