import { describe, it, expect, beforeEach } from 'vitest';
import { CADCore } from '../core/CADCore';
import { DXFParser, aciToHex } from '../core/interop/DXFParser';
import { DXFSerializer, hexToAci } from '../core/interop/DXFSerializer';
import { DWGHeaderReader } from '../core/interop/DWGHeaderReader';
import { RasterImageManager } from '../core/interop/RasterImageManager';
import {
  LineEntity,
  CircleEntity,
  ArcEntity,
  PolylineEntity,
  TextEntity,
  ImageEntity,
} from '../core/types';

describe('Phase 6: Interoperability - DXF, DWG & Raster Images', () => {
  let core: CADCore;

  beforeEach(() => {
    core = new CADCore(800, 600);
  });

  // ---------------------------------------------------------------------------
  // 1. Color Index (ACI <-> HEX) Converters
  // ---------------------------------------------------------------------------
  describe('ACI <-> Hex Color Conversion', () => {
    it('correctly maps standard ACI indices to hex', () => {
      expect(aciToHex(1)).toBe('#ff0000'); // Red
      expect(aciToHex(2)).toBe('#ffff00'); // Yellow
      expect(aciToHex(3)).toBe('#00ff00'); // Green
      expect(aciToHex(4)).toBe('#00ffff'); // Cyan
      expect(aciToHex(5)).toBe('#0000ff'); // Blue
      expect(aciToHex(6)).toBe('#ff00ff'); // Magenta
      expect(aciToHex(7)).toBe('#ffffff'); // White
    });

    it('correctly maps hex colors to standard ACI indices', () => {
      expect(hexToAci('#ff0000')).toBe(1);
      expect(hexToAci('#ffff00')).toBe(2);
      expect(hexToAci('#00ff00')).toBe(3);
      expect(hexToAci('#00ffff')).toBe(4);
      expect(hexToAci('#0000ff')).toBe(5);
      expect(hexToAci('#ff00ff')).toBe(6);
      expect(hexToAci('#ffffff')).toBe(7);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DWG Binary Header Reader
  // ---------------------------------------------------------------------------
  describe('DWG Binary Header Reader', () => {
    it('identifies AutoCAD 2018-2026 DWG header (AC1032)', () => {
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      const magic = 'AC1032\0';
      for (let i = 0; i < magic.length; i++) {
        view[i] = magic.charCodeAt(i);
      }

      const info = DWGHeaderReader.readHeader(buffer);
      expect(info.valid).toBe(true);
      expect(info.versionCode).toBe('AC1032');
      expect(info.releaseYear).toContain('2018');
    });

    it('identifies AutoCAD 2000 DWG header (AC1015)', () => {
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      const magic = 'AC1015\0';
      for (let i = 0; i < magic.length; i++) {
        view[i] = magic.charCodeAt(i);
      }

      const info = DWGHeaderReader.readHeader(buffer);
      expect(info.valid).toBe(true);
      expect(info.versionCode).toBe('AC1015');
      expect(info.releaseYear).toContain('2000');
    });

    it('identifies legacy AutoCAD R12 DWG header (AC1009)', () => {
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      const magic = 'AC1009\0';
      for (let i = 0; i < magic.length; i++) {
        view[i] = magic.charCodeAt(i);
      }

      const info = DWGHeaderReader.readHeader(buffer);
      expect(info.valid).toBe(true);
      expect(info.versionCode).toBe('AC1009');
      expect(info.releaseYear).toContain('Release 11');
    });

    it('rejects invalid or corrupted binary file', () => {
      const buffer = new ArrayBuffer(32);
      const view = new Uint8Array(buffer);
      view.set([0x89, 0x50, 0x4e, 0x47]); // PNG header

      const info = DWGHeaderReader.readHeader(buffer);
      expect(info.valid).toBe(false);
      expect(info.versionCode).toBe('UNKNOWN');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. DXF Serializer (AC1015 ASCII standard)
  // ---------------------------------------------------------------------------
  describe('DXF Serializer', () => {
    it('serializes empty drawing with valid sections and EOF', () => {
      const dxf = DXFSerializer.serialize([], [{ id: '0', name: '0', color: '#ffffff', visible: true, locked: false }]);
      expect(dxf).toContain('SECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015');
      expect(dxf).toContain('SECTION\n2\nTABLES');
      expect(dxf).toContain('SECTION\n2\nENTITIES');
      expect(dxf).toContain('0\nEOF');
    });

    it('serializes LINE, CIRCLE, ARC, and TEXT entities', () => {
      const line: LineEntity = {
        id: 'l1',
        type: 'line',
        layerId: '0',
        start: { x: 10, y: 20 },
        end: { x: 100, y: 200 },
        visible: true,
      };
      const circle: CircleEntity = {
        id: 'c1',
        type: 'circle',
        layerId: '0',
        center: { x: 50, y: 50 },
        radius: 25,
        visible: true,
      };
      const arc: ArcEntity = {
        id: 'a1',
        type: 'arc',
        layerId: '0',
        center: { x: 0, y: 0 },
        radius: 30,
        startAngle: 0,
        endAngle: Math.PI / 2, // 90 deg
        visible: true,
      };
      const text: TextEntity = {
        id: 't1',
        type: 'text',
        layerId: '0',
        position: { x: 15, y: 25 },
        text: 'SALA DE ESTAR',
        fontSize: 12,
        visible: true,
      };

      const dxf = DXFSerializer.serialize([line, circle, arc, text], [{ id: '0', name: '0', color: '#ffffff', visible: true, locked: false }]);

      expect(dxf).toContain('0\nLINE');
      expect(dxf).toContain('10\n10');
      expect(dxf).toContain('20\n20');
      expect(dxf).toContain('11\n100');
      expect(dxf).toContain('21\n200');

      expect(dxf).toContain('0\nCIRCLE');
      expect(dxf).toContain('40\n25');

      expect(dxf).toContain('0\nARC');
      expect(dxf).toContain('50\n0');
      expect(dxf).toContain('51\n90');

      expect(dxf).toContain('0\nTEXT');
      expect(dxf).toContain('1\nSALA DE ESTAR');
      expect(dxf).toContain('40\n12');
    });

    it('serializes LWPOLYLINE with vertices and bulge factors', () => {
      const poly: PolylineEntity = {
        id: 'pl1',
        type: 'polyline',
        layerId: '0',
        points: [
          { x: 0, y: 0, bulge: 0.5 },
          { x: 50, y: 0 },
          { x: 50, y: 50 },
        ],
        vertices: [
          { x: 0, y: 0, bulge: 0.5 },
          { x: 50, y: 0 },
          { x: 50, y: 50 },
        ],
        closed: true,
        visible: true,
      };

      const dxf = DXFSerializer.serialize([poly], [{ id: '0', name: '0', color: '#ffffff', visible: true, locked: false }]);

      expect(dxf).toContain('0\nLWPOLYLINE');
      expect(dxf).toContain('90\n3'); // 3 vertices
      expect(dxf).toContain('70\n1'); // closed flag
      expect(dxf).toContain('42\n0.5'); // bulge factor
    });
  });

  // ---------------------------------------------------------------------------
  // 4. DXF Parser (ASCII Group Code Tokenizer)
  // ---------------------------------------------------------------------------
  describe('DXF Parser', () => {
    it('parses basic DXF ASCII with layers and lines', () => {
      const dxfContent = `0
SECTION
2
TABLES
0
TABLE
2
LAYER
0
LAYER
2
PAREDES
62
1
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
0
LINE
8
PAREDES
10
10.5
20
20.5
11
110.5
21
220.5
0
ENDSEC
0
EOF`;

      const parser = new DXFParser();
      const result = parser.parse(dxfContent);

      expect(result.layers.length).toBeGreaterThan(0);
      const layer = result.layers.find((l) => l.name === 'PAREDES');
      expect(layer).toBeDefined();
      expect(layer?.color).toBe('#ff0000'); // ACI 1 = Red

      expect(result.entities.length).toBe(1);
      const line = result.entities[0] as LineEntity;
      expect(line.type).toBe('line');
      expect(line.start.x).toBe(10.5);
      expect(line.start.y).toBe(20.5);
      expect(line.end.x).toBe(110.5);
      expect(line.end.y).toBe(220.5);
      expect(line.layerId).toBe('PAREDES');
    });

    it('parses CIRCLE and ARC with degree-to-radian conversion', () => {
      const dxfContent = `0
SECTION
2
ENTITIES
0
CIRCLE
8
0
10
100
20
150
40
45
0
ARC
8
0
10
0
20
0
40
50
50
45
51
180
0
ENDSEC
0
EOF`;

      const parser = new DXFParser();
      const result = parser.parse(dxfContent);

      expect(result.entities.length).toBe(2);

      const circle = result.entities[0] as CircleEntity;
      expect(circle.type).toBe('circle');
      expect(circle.center.x).toBe(100);
      expect(circle.center.y).toBe(150);
      expect(circle.radius).toBe(45);

      const arc = result.entities[1] as ArcEntity;
      expect(arc.type).toBe('arc');
      expect(arc.radius).toBe(50);
      // 45 deg = PI / 4 rad, 180 deg = PI rad
      expect(arc.startAngle).toBeCloseTo(Math.PI / 4, 3);
      expect(arc.endAngle).toBeCloseTo(Math.PI, 3);
    });

    it('parses LWPOLYLINE with vertices and bulge', () => {
      const dxfContent = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
2
70
1
10
0
20
0
42
0.414
10
100
20
0
0
ENDSEC
0
EOF`;

      const parser = new DXFParser();
      const result = parser.parse(dxfContent);

      expect(result.entities.length).toBe(1);
      const poly = result.entities[0] as PolylineEntity;
      expect(poly.type).toBe('polyline');
      expect(poly.closed).toBe(true);
      const vertices = poly.vertices || poly.points;
      expect(vertices.length).toBe(2);
      expect(vertices[0].bulge).toBe(0.414);
      expect(vertices[1].x).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Round-trip Fidelity & Scale Transform
  // ---------------------------------------------------------------------------
  describe('DXF Round-Trip & CADCore Integration', () => {
    it('serializes and re-imports entities with identical geometric parameters', () => {
      // Setup entities in core
      const l: LineEntity = {
        id: 'line_1',
        type: 'line',
        layerId: '0',
        start: { x: 50, y: 60 },
        end: { x: 150, y: 260 },
        visible: true,
      };
      const c: CircleEntity = {
        id: 'circle_1',
        type: 'circle',
        layerId: '0',
        center: { x: 200, y: 200 },
        radius: 75,
        visible: true,
      };
      core.addEntity(l);
      core.addEntity(c);

      // Export to DXF
      const dxf = core.exportDXF();
      expect(typeof dxf).toBe('string');
      expect(dxf.length).toBeGreaterThan(100);

      // Import into fresh core
      const core2 = new CADCore(800, 600);
      const stats = core2.importDXF(dxf, { clearExisting: true });

      expect(stats.entitiesCount).toBe(2);
      const ents = core2.getEntities();
      expect(ents.length).toBe(2);

      const impLine = ents.find((e) => e.type === 'line') as LineEntity;
      expect(impLine).toBeDefined();
      expect(impLine.start.x).toBe(50);
      expect(impLine.start.y).toBe(60);
      expect(impLine.end.x).toBe(150);
      expect(impLine.end.y).toBe(260);

      const impCircle = ents.find((e) => e.type === 'circle') as CircleEntity;
      expect(impCircle).toBeDefined();
      expect(impCircle.center.x).toBe(200);
      expect(impCircle.center.y).toBe(200);
      expect(impCircle.radius).toBe(75);
    });

    it('scales entities accurately during import when scale factor is specified', () => {
      const dxfContent = `0
SECTION
2
ENTITIES
0
LINE
8
0
10
1000
20
2000
11
3000
21
4000
0
CIRCLE
8
0
10
5000
20
5000
40
1000
0
ENDSEC
0
EOF`;

      // Import with scale 0.001 (mm to m)
      const res = core.importDXF(dxfContent, { scale: 0.001 });
      expect(res.entitiesCount).toBe(2);

      const ents = core.getEntities();
      const line = ents.find((e) => e.type === 'line') as LineEntity;
      expect(line.start.x).toBeCloseTo(1.0, 4);
      expect(line.start.y).toBeCloseTo(2.0, 4);
      expect(line.end.x).toBeCloseTo(3.0, 4);
      expect(line.end.y).toBeCloseTo(4.0, 4);

      const circle = ents.find((e) => e.type === 'circle') as CircleEntity;
      expect(circle.center.x).toBeCloseTo(5.0, 4);
      expect(circle.radius).toBeCloseTo(1.0, 4);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Raster Image Attachment & 2-Point Scale Calibration
  // ---------------------------------------------------------------------------
  describe('Raster Image Manager & Scale Calibration', () => {
    it('creates and attaches raster image with correct properties', () => {
      const img = core.attachRasterImage({
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        position: { x: 100, y: 150 },
        width: 800,
        height: 600,
        opacity: 0.75,
        name: 'planta_baixa.png',
      });

      expect(img.type).toBe('image');
      expect(img.position.x).toBe(100);
      expect(img.position.y).toBe(150);
      expect(img.width).toBe(800);
      expect(img.height).toBe(600);
      expect(img.opacity).toBe(0.75);
      expect(core.getEntity(img.id)).toBeDefined();
    });

    it('calibrates raster image scale using 2 reference points and real distance', () => {
      const initialImage: ImageEntity = {
        id: 'img_test_1',
        type: 'image',
        layerId: '0',
        url: 'test.jpg',
        position: { x: 0, y: 0 },
        width: 400,
        height: 200,
        visible: true,
      };

      // User clicks two points on the image that measure 50 units in drawing space:
      // p1 = (0, 0), p2 = (50, 0) -> distance = 50
      // User says: "This door is actually 100 units (meters/centimeters) wide"
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 50, y: 0 };
      const realDistance = 100; // factor = 100 / 50 = 2.0

      const scaled = RasterImageManager.calibrateScale(initialImage, p1, p2, realDistance);

      expect(scaled.width).toBe(800);  // 400 * 2.0
      expect(scaled.height).toBe(400); // 200 * 2.0
      expect(scaled.position.x).toBe(0);
      expect(scaled.position.y).toBe(0);
    });

    it('keeps first reference point stationary when scaling with offset origin', () => {
      const initialImage: ImageEntity = {
        id: 'img_test_2',
        type: 'image',
        layerId: '0',
        url: 'test.jpg',
        position: { x: 100, y: 100 },
        width: 200,
        height: 100,
        visible: true,
      };

      // Reference points inside image:
      // p1 = (120, 120), p2 = (160, 120) -> distance = 40
      // Real distance = 80 -> factor = 2.0
      const p1 = { x: 120, y: 120 };
      const p2 = { x: 160, y: 120 };
      const realDistance = 80;

      const scaled = RasterImageManager.calibrateScale(initialImage, p1, p2, realDistance);

      expect(scaled.width).toBe(400); // 200 * 2
      expect(scaled.height).toBe(200); // 100 * 2

      // Since offset of p1 from original origin was (20, 20),
      // new origin should be 120 - 20 * 2 = 80, and 120 - 20 * 2 = 80.
      expect(scaled.position.x).toBe(80);
      expect(scaled.position.y).toBe(80);
    });

    it('integrates calibrateImageScale seamlessly with CADCore', () => {
      const img = core.attachRasterImage({
        url: 'test.jpg',
        position: { x: 0, y: 0 },
        width: 100,
        height: 50,
      });

      const success = core.calibrateImageScale(img.id, { x: 0, y: 0 }, { x: 25, y: 0 }, 100);
      expect(success).toBe(true);

      const updated = core.getEntity(img.id) as ImageEntity;
      expect(updated.width).toBe(400); // 100 * 4
      expect(updated.height).toBe(200); // 50 * 4
    });
  });
});
