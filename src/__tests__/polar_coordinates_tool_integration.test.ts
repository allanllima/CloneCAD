import { describe, it, expect, beforeEach } from 'vitest';
import { CADCore } from '../core/CADCore';
import { LinePlugin } from '../plugins/draw/LinePlugin';
import { CirclePlugin } from '../plugins/draw/CirclePlugin';
import { RectanglePlugin } from '../plugins/draw/RectanglePlugin';
import { PolylinePlugin } from '../plugins/draw/PolylinePlugin';
import { LineEntity, CircleEntity, RectangleEntity, PolylineEntity } from '../core/types';

describe('CADCore Polar Coordinates Tool Integration', () => {
  let core: CADCore;

  beforeEach(() => {
    core = new CADCore(1000, 800);
    new LinePlugin().init(core);
    new CirclePlugin().init(core);
    new RectanglePlugin().init(core);
    new PolylinePlugin().init(core);
  });

  it('draws a line using polar coordinates (@50<45) from first point', () => {
    core.setActiveTool('line');

    // 1. Enter first point at (100, 100)
    const p1Ok = core.inputCoordinate('100,100');
    expect(p1Ok).toBe(true);

    // Verify active base point is now (100, 100)
    const basePoint = core.getActiveBasePoint();
    expect(basePoint).not.toBeNull();
    expect(basePoint!.x).toBe(100);
    expect(basePoint!.y).toBe(100);

    // 2. Enter second point at 50 units at 0 degrees (+X direction) -> (150, 100)
    const p2Ok = core.inputCoordinate('50<0');
    expect(p2Ok).toBe(true);

    // Verify created line entity
    const entities = core.getEntities().filter((e) => e.type === 'line') as LineEntity[];
    expect(entities.length).toBe(1);
    expect(entities[0].start.x).toBe(100);
    expect(entities[0].start.y).toBe(100);
    expect(entities[0].end.x).toBeCloseTo(150, 2);
    expect(entities[0].end.y).toBeCloseTo(100, 2);
  });

  it('draws consecutive line segments with relative polar angles (@100<90)', () => {
    core.setActiveTool('line');

    core.inputCoordinate('0,0');
    core.inputCoordinate('100<0'); // to (100, 0)
    core.inputCoordinate('@100<90'); // to (100, 100)

    const lines = core.getEntities().filter((e) => e.type === 'line') as LineEntity[];
    expect(lines.length).toBe(2);

    expect(lines[0].start).toEqual({ x: 0, y: 0 });
    expect(lines[0].end.x).toBeCloseTo(100, 2);
    expect(lines[0].end.y).toBeCloseTo(0, 2);

    expect(lines[1].start.x).toBeCloseTo(100, 2);
    expect(lines[1].start.y).toBeCloseTo(0, 2);
    expect(lines[1].end.x).toBeCloseTo(100, 2);
    expect(lines[1].end.y).toBeCloseTo(100, 2);
  });

  it('draws circle by specifying center and polar radius (@25<0)', () => {
    core.setActiveTool('circle');

    // Specify center point
    core.inputCoordinate('50,50');

    // Specify point on circumference using polar coordinate (radius 30 at 45 deg)
    core.inputCoordinate('30<45');

    const circles = core.getEntities().filter((e) => e.type === 'circle') as CircleEntity[];
    expect(circles.length).toBe(1);
    expect(circles[0].center.x).toBe(50);
    expect(circles[0].center.y).toBe(50);
    expect(circles[0].radius).toBeCloseTo(30, 2);
  });

  it('supports direct distance entry along cursor direction for line tool', () => {
    core.setActiveTool('line');

    core.inputCoordinate('0,0');

    // Cursor is pointing in direction of (100, 0)
    const cursor = { x: 50, y: 0 };
    // User types single distance "75"
    const ok = core.inputCoordinate('75', cursor);
    expect(ok).toBe(true);

    const lines = core.getEntities().filter((e) => e.type === 'line') as LineEntity[];
    expect(lines.length).toBe(1);
    expect(lines[0].end.x).toBeCloseTo(75, 2);
    expect(lines[0].end.y).toBeCloseTo(0, 2);
  });

  it('supports direct distance entry with Ortho mode', () => {
    core.setOrthoMode(true);
    core.setActiveTool('line');

    core.inputCoordinate('0,0');

    // Cursor is at (20, 80) -> Ortho snaps to vertical (+Y)
    const cursor = { x: 20, y: 80 };
    core.inputCoordinate('120', cursor);

    const lines = core.getEntities().filter((e) => e.type === 'line') as LineEntity[];
    expect(lines.length).toBe(1);
    expect(lines[0].end.x).toBeCloseTo(0, 2);
    expect(lines[0].end.y).toBeCloseTo(120, 2);
  });
});
