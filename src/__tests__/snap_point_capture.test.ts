import { describe, it, expect } from 'vitest';
import { SnapEngine } from '../core/SnapEngine';
import { CADEntity, Point2D } from '../core/types';

describe('SnapEngine & Point Capture Enhancement', () => {
  const identityWorldToScreen = (p: Point2D) => ({ x: p.x, y: p.y });

  it('prioritizes endpoint over nearest even when mouse is closer to the edge', () => {
    const snapEngine = new SnapEngine();
    // Segment from (0, 0) to (100, 0)
    const line: CADEntity = {
      id: 'line-1',
      type: 'line',
      layer: '0',
      color: '#ffffff',
      lineWeight: 1,
      lineType: 'continuous',
      visible: true,
      locked: false,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
    } as any;

    // Mouse is at (5, 2)
    // Distance to edge (5, 0) is 2px.
    // Distance to endpoint (0, 0) is hypot(5, 2) ~ 5.38px (well within 20px tolerance).
    // Landmark priority must ensure the endpoint is snapped, NOT nearest!
    const mouse: Point2D = { x: 5, y: 2 };
    const snap = snapEngine.findSnap([line], mouse, identityWorldToScreen, mouse);

    expect(snap).not.toBeNull();
    expect(snap!.type).toBe('endpoint');
    expect(snap!.point.x).toBe(0);
    expect(snap!.point.y).toBe(0);
  });

  it('correctly captures midpoint on segments', () => {
    const snapEngine = new SnapEngine();
    const line: CADEntity = {
      id: 'line-2',
      type: 'line',
      layer: '0',
      color: '#ffffff',
      lineWeight: 1,
      lineType: 'continuous',
      visible: true,
      locked: false,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
    } as any;

    // Mouse near midpoint (50, 0), say (48, 3)
    const mouse: Point2D = { x: 48, y: 3 };
    const snap = snapEngine.findSnap([line], mouse, identityWorldToScreen, mouse);

    expect(snap).not.toBeNull();
    expect(snap!.type).toBe('midpoint');
    expect(snap!.point.x).toBe(50);
    expect(snap!.point.y).toBe(0);
  });

  it('falls back to nearest when mouse is far from discrete landmarks', () => {
    const snapEngine = new SnapEngine();
    const line: CADEntity = {
      id: 'line-3',
      type: 'line',
      layer: '0',
      color: '#ffffff',
      lineWeight: 1,
      lineType: 'continuous',
      visible: true,
      locked: false,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
    } as any;

    // Mouse at (25, 2) is >25px from (0,0) and >25px from (50,0)
    // Distance to edge is 2px
    const mouse: Point2D = { x: 25, y: 2 };
    const snap = snapEngine.findSnap([line], mouse, identityWorldToScreen, mouse);

    expect(snap).not.toBeNull();
    expect(snap!.type).toBe('nearest');
    expect(snap!.point.x).toBe(25);
    expect(snap!.point.y).toBe(0);
  });

  it('captures intersection points between entities', () => {
    const snapEngine = new SnapEngine();
    const line1: CADEntity = {
      id: 'line-a',
      type: 'line',
      layer: '0',
      color: '#ffffff',
      lineWeight: 1,
      lineType: 'continuous',
      visible: true,
      locked: false,
      start: { x: 0, y: 50 },
      end: { x: 100, y: 50 },
    } as any;

    const line2: CADEntity = {
      id: 'line-b',
      type: 'line',
      layer: '0',
      color: '#ffffff',
      lineWeight: 1,
      lineType: 'continuous',
      visible: true,
      locked: false,
      start: { x: 50, y: 0 },
      end: { x: 50, y: 100 },
    } as any;

    // Intersection is at (50, 50). Mouse at (53, 52)
    const mouse: Point2D = { x: 53, y: 52 };
    const snap = snapEngine.findSnap([line1, line2], mouse, identityWorldToScreen, mouse);

    expect(snap).not.toBeNull();
    // (50,50) is also midpoint of both lines or intersection
    expect(snap!.point.x).toBe(50);
    expect(snap!.point.y).toBe(50);
  });

  it('captures rectangle corners and edge midpoints', () => {
    const snapEngine = new SnapEngine();
    const rect: CADEntity = {
      id: 'rect-1',
      type: 'rectangle',
      layer: '0',
      color: '#ffffff',
      lineWeight: 1,
      lineType: 'continuous',
      visible: true,
      locked: false,
      origin: { x: 10, y: 10 },
      width: 80,
      height: 40,
    } as any;

    // Near top-right corner (90, 50)
    const mouseNearCorner: Point2D = { x: 88, y: 49 };
    const snapCorner = snapEngine.findSnap([rect], mouseNearCorner, identityWorldToScreen, mouseNearCorner);
    expect(snapCorner).not.toBeNull();
    expect(snapCorner!.type).toBe('endpoint');
    expect(snapCorner!.point.x).toBe(90);
    expect(snapCorner!.point.y).toBe(50);

    // Near top edge midpoint (50, 50)
    const mouseNearMid: Point2D = { x: 52, y: 51 };
    const snapMid = snapEngine.findSnap([rect], mouseNearMid, identityWorldToScreen, mouseNearMid);
    expect(snapMid).not.toBeNull();
    expect(snapMid!.type).toBe('midpoint');
    expect(snapMid!.point.x).toBe(50);
    expect(snapMid!.point.y).toBe(50);
  });
});
