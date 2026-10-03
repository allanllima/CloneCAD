import { describe, it, expect } from 'vitest';
import { CoordinateParser } from '../core/geometry/CoordinateParser';
import { Point2D } from '../core/types';

describe('CoordinateParser (AutoCAD Polar & Cartesian Input)', () => {
  const origin: Point2D = { x: 0, y: 0 };
  const basePoint: Point2D = { x: 100, y: 50 };

  describe('Polar Coordinates', () => {
    it('parses relative polar coordinate with @ prefix', () => {
      // 50 units at 0 degrees from (100, 50) -> (150, 50)
      const res = CoordinateParser.parse('@50<0', basePoint);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('relative_polar');
      expect(res!.point.x).toBeCloseTo(150, 4);
      expect(res!.point.y).toBeCloseTo(50, 4);
      expect(res!.rawDistance).toBe(50);
      expect(res!.rawAngleDeg).toBe(0);
    });

    it('parses relative polar coordinate at 90 degrees', () => {
      // 50 units at 90 degrees (+Y) from (100, 50) -> (100, 100)
      const res = CoordinateParser.parse('@50<90', basePoint);
      expect(res).not.toBeNull();
      expect(res!.point.x).toBeCloseTo(100, 4);
      expect(res!.point.y).toBeCloseTo(100, 4);
    });

    it('parses relative polar coordinate at 45 degrees', () => {
      // 100 units at 45 degrees
      const res = CoordinateParser.parse('@100<45', basePoint);
      expect(res).not.toBeNull();
      const expectedX = 100 + 100 * Math.cos(Math.PI / 4);
      const expectedY = 50 + 100 * Math.sin(Math.PI / 4);
      expect(res!.point.x).toBeCloseTo(expectedX, 4);
      expect(res!.point.y).toBeCloseTo(expectedY, 4);
    });

    it('parses polar coordinate without prefix as relative when basePoint exists', () => {
      // AutoCAD default: when in a command with base point, "50<180" is relative
      const res = CoordinateParser.parse('50<180', basePoint);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('relative_polar');
      expect(res!.point.x).toBeCloseTo(50, 4);
      expect(res!.point.y).toBeCloseTo(50, 4);
    });

    it('parses polar coordinate without prefix as absolute when no basePoint exists', () => {
      const res = CoordinateParser.parse('50<90', null);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('absolute_polar');
      expect(res!.point.x).toBeCloseTo(0, 4);
      expect(res!.point.y).toBeCloseTo(50, 4);
    });

    it('parses explicit absolute polar with # prefix even when basePoint exists', () => {
      // #50<0 is measured from (0,0) -> (50, 0)
      const res = CoordinateParser.parse('#50<0', basePoint);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('absolute_polar');
      expect(res!.point.x).toBeCloseTo(50, 4);
      expect(res!.point.y).toBeCloseTo(0, 4);
    });

    it('handles negative angles (e.g. -45 degrees)', () => {
      const res = CoordinateParser.parse('@100<-90', basePoint);
      expect(res).not.toBeNull();
      expect(res!.point.x).toBeCloseTo(100, 4);
      expect(res!.point.y).toBeCloseTo(-50, 4);
    });

    it('handles decimal distances and angles with spaces', () => {
      const res = CoordinateParser.parse(' 25.5 < 30.5 ', basePoint);
      expect(res).not.toBeNull();
      expect(res!.rawDistance).toBeCloseTo(25.5, 4);
      expect(res!.rawAngleDeg).toBeCloseTo(30.5, 4);
    });
  });

  describe('Cartesian Coordinates', () => {
    it('parses relative Cartesian coordinate with @ prefix', () => {
      const res = CoordinateParser.parse('@20,30', basePoint);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('relative_cartesian');
      expect(res!.point.x).toBe(120);
      expect(res!.point.y).toBe(80);
    });

    it('parses absolute Cartesian coordinate', () => {
      const res = CoordinateParser.parse('200,150', basePoint);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('absolute_cartesian');
      expect(res!.point.x).toBe(200);
      expect(res!.point.y).toBe(150);
    });

    it('parses explicit absolute Cartesian coordinate with # prefix', () => {
      const res = CoordinateParser.parse('#50,-30', basePoint);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('absolute_cartesian');
      expect(res!.point.x).toBe(50);
      expect(res!.point.y).toBe(-30);
    });
  });

  describe('Direct Distance Entry', () => {
    it('projects distance along cursor direction', () => {
      // basePoint is (100, 50), cursor is at (200, 50) -> direction is +X (angle 0)
      const cursor: Point2D = { x: 200, y: 50 };
      const res = CoordinateParser.parse('75', basePoint, cursor, false);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('direct_distance');
      expect(res!.point.x).toBeCloseTo(175, 4);
      expect(res!.point.y).toBeCloseTo(50, 4);
    });

    it('projects distance along diagonal cursor direction', () => {
      // cursor is at (200, 150) -> dx = 100, dy = 100 (45 degrees)
      const cursor: Point2D = { x: 200, y: 150 };
      const res = CoordinateParser.parse('100', basePoint, cursor, false);
      expect(res).not.toBeNull();
      expect(res!.mode).toBe('direct_distance');
      const expectedX = 100 + 100 * Math.cos(Math.PI / 4);
      const expectedY = 50 + 100 * Math.sin(Math.PI / 4);
      expect(res!.point.x).toBeCloseTo(expectedX, 4);
      expect(res!.point.y).toBeCloseTo(expectedY, 4);
    });

    it('respects ortho mode for direct distance entry', () => {
      // cursor is at (180, 70) -> dx = 80, dy = 20 -> snaps to horizontal (+X)
      const cursor: Point2D = { x: 180, y: 70 };
      const res = CoordinateParser.parse('50', basePoint, cursor, true);
      expect(res).not.toBeNull();
      expect(res!.point.x).toBeCloseTo(150, 4);
      expect(res!.point.y).toBeCloseTo(50, 4);
    });

    it('returns null for single numbers when no basePoint is available', () => {
      const res = CoordinateParser.parse('100', null, null);
      expect(res).toBeNull();
    });
  });

  describe('Formatting & Helpers', () => {
    it('formats polar representations accurately', () => {
      const pt: Point2D = { x: 150, y: 50 };
      const polar = CoordinateParser.formatPolar(pt, basePoint);
      expect(polar.distance).toBeCloseTo(50, 4);
      expect(polar.angleDeg).toBeCloseTo(0, 4);
      expect(polar.formatted).toBe('50.00<0.0°');
    });

    it('creates polar point accurately', () => {
      const pt = CoordinateParser.polarPoint(basePoint, 50, 90);
      expect(pt.x).toBeCloseTo(100, 4);
      expect(pt.y).toBeCloseTo(100, 4);
    });
  });
});
