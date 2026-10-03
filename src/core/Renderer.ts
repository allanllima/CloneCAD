import * as THREE from 'three';
import {
  CADEntity,
  CADLayer,
  Point2D,
  ViewportState,
  CADGrip,
  CADBlockDefinition,
  BlockReferenceEntity,
  TextEntity,
  LineEntity,
  CircleEntity,
  RectangleEntity,
  ArcEntity,
  EllipseEntity,
} from './types';
import { Viewport } from './Viewport';
import { BulgeUtils } from './geometry/BulgeUtils';
import { SplineUtils } from './geometry/SplineUtils';
import { EllipseUtils } from './geometry/EllipseUtils';
import { HatchUtils } from './geometry/HatchUtils';
import { PolygonBooleanUtils } from './geometry/PolygonBooleanUtils';
import { TrackingRay } from './TrackingEngine';

export class CADRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private viewport: Viewport;

  // Groups
  private gridGroup: THREE.Group;
  private entityGroup: THREE.Group;
  private previewGroup: THREE.Group;
  private selectionBoxGroup: THREE.Group;
  private ucsGroup: THREE.Group;
  private trackingGroup: THREE.Group;
  private gripsGroup: THREE.Group;

  private blockResolver?: (name: string) => CADBlockDefinition | undefined;

  // Render loop flag
  private animationFrameId: number | null = null;
  private needsRender = false;

  // Materials Cache
  private lineMaterials: Map<string, THREE.LineBasicMaterial> = new Map();
  private selectedMaterial: THREE.LineBasicMaterial;
  private previewMaterial: THREE.LineBasicMaterial;
  private gridMinorMaterial: THREE.LineBasicMaterial;
  private gridMajorMaterial: THREE.LineBasicMaterial;
  private axisXMaterial: THREE.LineBasicMaterial;
  private axisYMaterial: THREE.LineBasicMaterial;

  constructor(container: HTMLElement, viewport: Viewport) {
    this.container = container;
    this.viewport = viewport;

    // 1. Three.js Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x21252b); // Classic dark CAD canvas

    // 2. Camera (Orthographic)
    const { width, height, cameraX, cameraY, zoom } = viewport.getState();
    const halfW = width / (2 * zoom);
    const halfH = height / (2 * zoom);
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 2000);
    this.camera.position.set(cameraX, cameraY, 1000);
    this.camera.lookAt(cameraX, cameraY, 0);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    // 4. Groups
    this.gridGroup = new THREE.Group();
    this.entityGroup = new THREE.Group();
    this.previewGroup = new THREE.Group();
    this.selectionBoxGroup = new THREE.Group();
    this.ucsGroup = new THREE.Group();
    this.trackingGroup = new THREE.Group();
    this.gripsGroup = new THREE.Group();

    this.scene.add(this.gridGroup);
    this.scene.add(this.entityGroup);
    this.scene.add(this.previewGroup);
    this.scene.add(this.selectionBoxGroup);
    this.scene.add(this.ucsGroup);
    this.scene.add(this.trackingGroup);
    this.scene.add(this.gripsGroup);

    // 5. Materials
    this.selectedMaterial = new THREE.LineBasicMaterial({
      color: 0x00e5ff, // Bright Cyan for selected entities
      linewidth: 2,
    });
    this.previewMaterial = new THREE.LineBasicMaterial({
      color: 0xffaa00, // Golden Orange for preview/rubberband
      linewidth: 1.5,
      transparent: true,
      opacity: 0.85,
    });
    this.gridMinorMaterial = new THREE.LineBasicMaterial({
      color: 0x2c313a, // Subtle minor grid
      transparent: true,
      opacity: 0.6,
    });
    this.gridMajorMaterial = new THREE.LineBasicMaterial({
      color: 0x3e4451, // Distinct major grid
      transparent: true,
      opacity: 0.8,
    });
    this.axisXMaterial = new THREE.LineBasicMaterial({ color: 0xe06c75, linewidth: 2 }); // Red X axis
    this.axisYMaterial = new THREE.LineBasicMaterial({ color: 0x98c379, linewidth: 2 }); // Green Y axis

    this.startLoop();
  }

  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public resize(width: number, height: number): void {
    this.viewport.setDimensions(width, height);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.updateCamera();
    this.requestRender();
  }

  public updateCamera(): void {
    const { width, height, cameraX, cameraY, zoom } = this.viewport.getState();
    const halfW = width / (2 * zoom);
    const halfH = height / (2 * zoom);

    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.position.set(cameraX, cameraY, 1000);
    this.camera.lookAt(cameraX, cameraY, 0);
    this.camera.updateProjectionMatrix();

    this.renderGrid();
    this.renderUcsIcon();
    this.requestRender();
  }

  public requestRender(): void {
    this.needsRender = true;
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.needsRender) {
        this.renderer.render(this.scene, this.camera);
        this.needsRender = false;
      }
    };
    animate();
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  // ---------------------------------------------------------------------------
  // Infinite Adaptive Grid Rendering
  // ---------------------------------------------------------------------------
  private renderGrid(): void {
    this.clearGroup(this.gridGroup);

    const vp = this.viewport.getState();
    const bounds = this.viewport.getVisibleBounds();
    const zoom = vp.zoom;

    // Calculate grid spacing based on zoom
    // We aim for roughly 40-100 pixels per minor grid cell
    const targetPixelDist = 50;
    const rawUnit = targetPixelDist / zoom;
    const exponent = Math.floor(Math.log10(rawUnit));
    const power = Math.pow(10, exponent);

    let minorStep = power;
    const ratio = rawUnit / power;
    if (ratio > 5) {
      minorStep = power * 5;
    } else if (ratio > 2) {
      minorStep = power * 2;
    }

    const majorStep = minorStep * 10;

    // Quantize visible bounds
    const startX = Math.floor(bounds.minX / minorStep) * minorStep;
    const endX = Math.ceil(bounds.maxX / minorStep) * minorStep;
    const startY = Math.floor(bounds.minY / minorStep) * minorStep;
    const endY = Math.ceil(bounds.maxY / minorStep) * minorStep;

    const minorPositions: number[] = [];
    const majorPositions: number[] = [];

    // Vertical grid lines
    for (let x = startX; x <= endX; x += minorStep) {
      const isMajor = Math.abs(Math.round(x / minorStep) % 10) === 0;
      const target = isMajor ? majorPositions : minorPositions;
      target.push(x, bounds.minY, 0, x, bounds.maxY, 0);
    }

    // Horizontal grid lines
    for (let y = startY; y <= endY; y += minorStep) {
      const isMajor = Math.abs(Math.round(y / minorStep) % 10) === 0;
      const target = isMajor ? majorPositions : minorPositions;
      target.push(bounds.minX, y, 0, bounds.maxX, y, 0);
    }

    if (minorPositions.length > 0) {
      const minorGeom = new THREE.BufferGeometry();
      minorGeom.setAttribute('position', new THREE.Float32BufferAttribute(minorPositions, 3));
      const minorLines = new THREE.LineSegments(minorGeom, this.gridMinorMaterial);
      this.gridGroup.add(minorLines);
    }

    if (majorPositions.length > 0) {
      const majorGeom = new THREE.BufferGeometry();
      majorGeom.setAttribute('position', new THREE.Float32BufferAttribute(majorPositions, 3));
      const majorLines = new THREE.LineSegments(majorGeom, this.gridMajorMaterial);
      this.gridGroup.add(majorLines);
    }

    // Origin X and Y Axes (highlighted like AutoCAD)
    if (bounds.minY <= 0 && bounds.maxY >= 0) {
      const xAxisGeom = new THREE.BufferGeometry();
      xAxisGeom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([bounds.minX, 0, 1, bounds.maxX, 0, 1], 3)
      );
      this.gridGroup.add(new THREE.LineSegments(xAxisGeom, this.axisXMaterial));
    }
    if (bounds.minX <= 0 && bounds.maxX >= 0) {
      const yAxisGeom = new THREE.BufferGeometry();
      yAxisGeom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([0, bounds.minY, 1, 0, bounds.maxY, 1], 3)
      );
      this.gridGroup.add(new THREE.LineSegments(yAxisGeom, this.axisYMaterial));
    }
  }

  // ---------------------------------------------------------------------------
  // UCS Icon (AutoCAD Style User Coordinate System Indicator)
  // ---------------------------------------------------------------------------
  private renderUcsIcon(): void {
    this.clearGroup(this.ucsGroup);

    const vp = this.viewport.getState();
    const zoom = vp.zoom;

    // Pin UCS icon in lower-left corner (offset 45px from bottom-left screen)
    const ucsScreenOrigin = { x: 45, y: vp.height - 45 };
    const ucsWorldOrigin = this.viewport.screenToWorld(ucsScreenOrigin.x, ucsScreenOrigin.y);

    const armLength = 32 / zoom; // 32 screen pixels length
    const arrowHead = 7 / zoom;

    // X axis (Red)
    const xPositions = [
      ucsWorldOrigin.x, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x + armLength, ucsWorldOrigin.y, 10,
      // Arrowhead
      ucsWorldOrigin.x + armLength, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x + armLength - arrowHead, ucsWorldOrigin.y + arrowHead * 0.4, 10,
      ucsWorldOrigin.x + armLength, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x + armLength - arrowHead, ucsWorldOrigin.y - arrowHead * 0.4, 10,
    ];
    const xGeom = new THREE.BufferGeometry();
    xGeom.setAttribute('position', new THREE.Float32BufferAttribute(xPositions, 3));
    this.ucsGroup.add(new THREE.LineSegments(xGeom, this.axisXMaterial));

    // Y axis (Green)
    const yPositions = [
      ucsWorldOrigin.x, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x, ucsWorldOrigin.y + armLength, 10,
      // Arrowhead
      ucsWorldOrigin.x, ucsWorldOrigin.y + armLength, 10,
      ucsWorldOrigin.x - arrowHead * 0.4, ucsWorldOrigin.y + armLength - arrowHead, 10,
      ucsWorldOrigin.x, ucsWorldOrigin.y + armLength, 10,
      ucsWorldOrigin.x + arrowHead * 0.4, ucsWorldOrigin.y + armLength - arrowHead, 10,
    ];
    const yGeom = new THREE.BufferGeometry();
    yGeom.setAttribute('position', new THREE.Float32BufferAttribute(yPositions, 3));
    this.ucsGroup.add(new THREE.LineSegments(yGeom, this.axisYMaterial));

    // Small UCS origin square
    const sq = 4 / zoom;
    const boxPositions = [
      ucsWorldOrigin.x, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x + sq, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x + sq, ucsWorldOrigin.y, 10,
      ucsWorldOrigin.x + sq, ucsWorldOrigin.y + sq, 10,
      ucsWorldOrigin.x + sq, ucsWorldOrigin.y + sq, 10,
      ucsWorldOrigin.x, ucsWorldOrigin.y + sq, 10,
      ucsWorldOrigin.x, ucsWorldOrigin.y + sq, 10,
      ucsWorldOrigin.x, ucsWorldOrigin.y, 10,
    ];
    const boxGeom = new THREE.BufferGeometry();
    boxGeom.setAttribute('position', new THREE.Float32BufferAttribute(boxPositions, 3));
    this.ucsGroup.add(new THREE.LineSegments(boxGeom, new THREE.LineBasicMaterial({ color: 0xcccccc })));
  }

  // ---------------------------------------------------------------------------
  // Entity Rendering
  // ---------------------------------------------------------------------------
  public renderEntities(entities: CADEntity[], layers: CADLayer[]): void {
    this.clearGroup(this.entityGroup);

    const layerMap = new Map(layers.map((l) => [l.id, l]));

    for (const ent of entities) {
      if (ent.visible === false) continue;
      const layer = layerMap.get(ent.layerId);
      if (layer && layer.visible === false) continue;

      const isSelected = !!ent.selected;
      const colorHex = isSelected
        ? 0x00e5ff
        : this.parseColorToHex(ent.color || (layer ? layer.color : '#ffffff'));

      const material = isSelected ? this.selectedMaterial : this.getOrCreateLineMaterial(colorHex);

      const object3D = this.buildEntityMesh(ent, material);
      if (object3D) {
        this.entityGroup.add(object3D);
      }
    }

    this.requestRender();
  }

  // ---------------------------------------------------------------------------
  // Preview Entity (Rubber Banding during draw/modify)
  // ---------------------------------------------------------------------------
  public renderPreview(previewEntity: CADEntity | null): void {
    this.clearGroup(this.previewGroup);
    if (!previewEntity) {
      this.requestRender();
      return;
    }

    const obj = this.buildEntityMesh(previewEntity, this.previewMaterial);
    if (obj) {
      this.previewGroup.add(obj);
    }
    this.requestRender();
  }

  // ---------------------------------------------------------------------------
  // Selection Box (AutoCAD Blue Window vs Green Crossing)
  // ---------------------------------------------------------------------------
  public renderSelectionBox(
    box: { start: Point2D; current: Point2D; isCrossing: boolean } | null
  ): void {
    this.clearGroup(this.selectionBoxGroup);
    if (!box) {
      this.requestRender();
      return;
    }

    const minX = Math.min(box.start.x, box.current.x);
    const maxX = Math.max(box.start.x, box.current.x);
    const minY = Math.min(box.start.y, box.current.y);
    const maxY = Math.max(box.start.y, box.current.y);

    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0.001 && height <= 0.001) return;

    // Fill plane
    const shape = new THREE.Shape();
    shape.moveTo(minX, minY);
    shape.lineTo(maxX, minY);
    shape.lineTo(maxX, maxY);
    shape.lineTo(minX, maxY);
    shape.closePath();

    const shapeGeom = new THREE.ShapeGeometry(shape);
    const fillColor = box.isCrossing ? 0x2ecc71 : 0x007acc; // Green crossing vs Blue window
    const fillMat = new THREE.MeshBasicMaterial({
      color: fillColor,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(shapeGeom, fillMat);
    fillMesh.position.z = 20;

    // Outline border
    const borderPositions = [
      minX, minY, 21, maxX, minY, 21,
      maxX, minY, 21, maxX, maxY, 21,
      maxX, maxY, 21, minX, maxY, 21,
      minX, maxY, 21, minX, minY, 21,
    ];
    const borderGeom = new THREE.BufferGeometry();
    borderGeom.setAttribute('position', new THREE.Float32BufferAttribute(borderPositions, 3));
    const borderMat = new THREE.LineBasicMaterial({
      color: box.isCrossing ? 0x2ecc71 : 0x0099ff,
      linewidth: 1.5,
    });
    const borderLines = new THREE.LineSegments(borderGeom, borderMat);

    this.selectionBoxGroup.add(fillMesh);
    this.selectionBoxGroup.add(borderLines);
    this.requestRender();
  }

  public renderTrackingRays(rays: TrackingRay[] | null): void {
    this.clearGroup(this.trackingGroup);

    if (!rays || rays.length === 0) {
      this.requestRender();
      return;
    }

    const { zoom } = this.viewport.getState();
    const dashSize = 6 / zoom;
    const gapSize = 4 / zoom;

    rays.forEach((ray) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [ray.start.x, ray.start.y, 25, ray.end.x, ray.end.y, 25],
          3
        )
      );
      const mat = new THREE.LineDashedMaterial({
        color: 0x22c55e, // AutoCAD tracking green
        dashSize,
        gapSize,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      line.computeLineDistances();
      this.trackingGroup.add(line);
    });

    this.requestRender();
  }

  public setBlockResolver(resolver: (name: string) => CADBlockDefinition | undefined): void {
    this.blockResolver = resolver;
  }

  public renderGrips(grips: CADGrip[] | null, activeGripId?: string | null): void {
    this.clearGroup(this.gripsGroup);
    if (!grips || grips.length === 0) {
      this.requestRender();
      return;
    }

    const { zoom } = this.viewport.getState();
    const halfSize = 4 / zoom; // ~8px screen size

    for (const grip of grips) {
      const isHot = grip.id === activeGripId;
      const x = grip.position.x;
      const y = grip.position.y;

      const shape = new THREE.Shape();
      shape.moveTo(x - halfSize, y - halfSize);
      shape.lineTo(x + halfSize, y - halfSize);
      shape.lineTo(x + halfSize, y + halfSize);
      shape.lineTo(x - halfSize, y + halfSize);
      shape.closePath();

      const geom = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({
        color: isHot ? 0xe06c75 : 0x007acc,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.z = 28;

      const borderGeom = new THREE.BufferGeometry();
      borderGeom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
          [
            x - halfSize, y - halfSize, 29,
            x + halfSize, y - halfSize, 29,
            x + halfSize, y + halfSize, 29,
            x - halfSize, y + halfSize, 29,
            x - halfSize, y - halfSize, 29,
          ],
          3
        )
      );
      const borderMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1.5 });
      const border = new THREE.Line(borderGeom, borderMat);

      this.gripsGroup.add(mesh);
      this.gripsGroup.add(border);
    }

    this.requestRender();
  }

  // ---------------------------------------------------------------------------
  // Entity Geometry Builders
  // ---------------------------------------------------------------------------
  private buildEntityMesh(ent: CADEntity, material: THREE.Material): THREE.Object3D | null {
    switch (ent.type) {
      case 'line': {
        const line = ent as any;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(
            [line.start.x, line.start.y, 5, line.end.x, line.end.y, 5],
            3
          )
        );
        return new THREE.LineSegments(geom, material);
      }

      case 'circle': {
        const circle = ent as any;
        const segments = Math.max(32, Math.min(128, Math.round(circle.radius * 2)));
        const geom = new THREE.BufferGeometry();
        const positions: number[] = [];
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          positions.push(
            circle.center.x + Math.cos(theta) * circle.radius,
            circle.center.y + Math.sin(theta) * circle.radius,
            5
          );
        }
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.Line(geom, material);
      }

      case 'rectangle': {
        const rect = ent as any;
        const x = rect.origin.x;
        const y = rect.origin.y;
        const w = rect.width;
        const h = rect.height;
        const positions = [
          x, y, 5, x + w, y, 5,
          x + w, y, 5, x + w, y + h, 5,
          x + w, y + h, 5, x, y + h, 5,
          x, y + h, 5, x, y, 5,
        ];
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.LineSegments(geom, material);
      }

      case 'polyline': {
        const poly = ent as any;
        const pts: any[] = poly.points || [];
        if (pts.length < 2) return null;
        const sampledPoints: Point2D[] = [];

        for (let i = 0; i < pts.length - 1; i++) {
          const curr = pts[i];
          const next = pts[i + 1];
          if (curr.bulge) {
            const arcPts = BulgeUtils.samplePoints(curr, next, curr.bulge, 16);
            // Append sampled points without duplicating endpoints
            for (let k = 0; k < arcPts.length - 1; k++) {
              sampledPoints.push(arcPts[k]);
            }
          } else {
            sampledPoints.push(curr);
          }
        }
        sampledPoints.push(pts[pts.length - 1]);

        if (poly.closed && pts.length > 2) {
          const last = pts[pts.length - 1];
          const first = pts[0];
          if (last.bulge) {
            const arcPts = BulgeUtils.samplePoints(last, first, last.bulge, 16);
            for (let k = 0; k < arcPts.length; k++) {
              sampledPoints.push(arcPts[k]);
            }
          } else {
            sampledPoints.push(first);
          }
        }

        const positions: number[] = [];
        for (const p of sampledPoints) {
          positions.push(p.x, p.y, 5);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.Line(geom, material);
      }

      case 'spline': {
        const spl = ent as any;
        const pts = spl.controlPoints || [];
        if (pts.length < 2) return null;

        const group = new THREE.Group();
        const sampled = SplineUtils.sampleSpline(pts, spl.closed, 24);
        const positions: number[] = [];
        for (const p of sampled) {
          positions.push(p.x, p.y, 5);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const curveLine = new THREE.Line(geom, material);
        group.add(curveLine);

        // If selected: show control polygon
        if (ent.selected && pts.length > 2) {
          const ctrlPositions: number[] = [];
          for (const p of pts) {
            ctrlPositions.push(p.x, p.y, 6);
          }
          if (spl.closed) {
            ctrlPositions.push(pts[0].x, pts[0].y, 6);
          }
          const ctrlGeom = new THREE.BufferGeometry();
          ctrlGeom.setAttribute('position', new THREE.Float32BufferAttribute(ctrlPositions, 3));
          const ctrlMat = new THREE.LineBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.6,
          });
          group.add(new THREE.Line(ctrlGeom, ctrlMat));
        }

        return group;
      }

      case 'ellipse': {
        const el = ent as any;
        const sampled = EllipseUtils.sampleEllipse(
          el.center,
          el.radiusX,
          el.radiusY,
          el.rotation || 0,
          el.startAngle || 0,
          el.endAngle || Math.PI * 2,
          64
        );
        const positions: number[] = [];
        for (const p of sampled) {
          positions.push(p.x, p.y, 5);
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.Line(geom, material);
      }

      case 'hatch': {
        const h = ent as any;
        const poly: Point2D[] = h.boundary || [];
        if (poly.length < 3) return null;

        const group = new THREE.Group();

        // 1. Solid fill plane (using triangulate)
        const indices = PolygonBooleanUtils.triangulate(poly);
        if (indices.length >= 3) {
          const positions: number[] = [];
          for (const p of poly) {
            positions.push(p.x, p.y, 3);
          }
          const shapeGeom = new THREE.BufferGeometry();
          shapeGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          shapeGeom.setIndex(indices);

          const fillColor = this.parseColorToHex(h.fillColor || h.color || '#445566');
          const opacity = h.pattern === 'SOLID' ? (h.opacity ?? 0.5) : 0.15;
          const fillMat = new THREE.MeshBasicMaterial({
            color: fillColor,
            transparent: true,
            opacity,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(shapeGeom, fillMat);
          group.add(mesh);
        }

        // 2. Pattern Lines (ANSI31, ANSI32, GRID, DOTS)
        if (h.pattern !== 'SOLID') {
          const lines = HatchUtils.generatePatternLines(poly, h.pattern, h.scale || 10, h.angle || Math.PI / 4);
          if (lines.length > 0) {
            const linePositions: number[] = [];
            for (const l of lines) {
              linePositions.push(l.start.x, l.start.y, 4, l.end.x, l.end.y, 4);
            }
            const lineGeom = new THREE.BufferGeometry();
            lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            const patternLines = new THREE.LineSegments(lineGeom, material);
            group.add(patternLines);
          }
        }

        // 3. Boundary outline
        const outlinePositions: number[] = [];
        for (const p of poly) {
          outlinePositions.push(p.x, p.y, 5);
        }
        outlinePositions.push(poly[0].x, poly[0].y, 5);
        const outlineGeom = new THREE.BufferGeometry();
        outlineGeom.setAttribute('position', new THREE.Float32BufferAttribute(outlinePositions, 3));
        group.add(new THREE.Line(outlineGeom, material));

        return group;
      }

      case 'arc': {
        const arc = ent as any;
        const segments = 48;
        let s = arc.startAngle;
        let e = arc.endAngle;
        if (e < s) e += Math.PI * 2;
        const sweep = e - s;

        const positions: number[] = [];
        for (let i = 0; i <= segments; i++) {
          const theta = s + (i / segments) * sweep;
          positions.push(
            arc.center.x + Math.cos(theta) * arc.radius,
            arc.center.y + Math.sin(theta) * arc.radius,
            5
          );
        }
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return new THREE.Line(geom, material);
      }

      case 'text': {
        const txt = ent as any;
        return this.buildTextSprite(txt);
      }

      case 'insert': {
        const ins = ent as BlockReferenceEntity;
        const def = this.blockResolver ? this.blockResolver(ins.blockName) : undefined;
        if (!def) return null;

        const group = new THREE.Group();
        group.position.set(ins.position.x, ins.position.y, 5);
        group.rotation.z = ins.rotation || 0;
        group.scale.set(ins.scale?.x ?? 1, ins.scale?.y ?? 1, 1);

        for (const sub of def.entities) {
          const shifted = this.shiftEntityByOffset(sub, -def.basePoint.x, -def.basePoint.y);
          const subMesh = this.buildEntityMesh(shifted, material);
          if (subMesh) {
            group.add(subMesh);
          }
        }

        if (def.attributes) {
          for (const attr of def.attributes) {
            const val = ins.attributeValues?.[attr.tag] ?? attr.defaultValue;
            const attrText: TextEntity = {
              id: `attr_${ins.id}_${attr.tag}`,
              type: 'text',
              layerId: ins.layerId,
              position: {
                x: attr.position.x - def.basePoint.x,
                y: attr.position.y - def.basePoint.y,
              },
              text: val,
              fontSize: attr.fontSize || 10,
              visible: true,
            };
            const textSprite = this.buildTextSprite(attrText);
            group.add(textSprite);
          }
        }

        return group;
      }

      default:
        return null;
    }
  }

  private shiftEntityByOffset(ent: CADEntity, dx: number, dy: number): CADEntity {
    const copy = JSON.parse(JSON.stringify(ent)) as CADEntity;
    if (copy.type === 'line') {
      const l = copy as LineEntity;
      l.start.x += dx; l.start.y += dy;
      l.end.x += dx; l.end.y += dy;
    } else if (copy.type === 'circle') {
      const c = copy as CircleEntity;
      c.center.x += dx; c.center.y += dy;
    } else if (copy.type === 'rectangle') {
      const r = copy as RectangleEntity;
      r.origin.x += dx; r.origin.y += dy;
    } else if (copy.type === 'arc') {
      const a = copy as ArcEntity;
      a.center.x += dx; a.center.y += dy;
    } else if (copy.type === 'ellipse') {
      const el = copy as EllipseEntity;
      el.center.x += dx; el.center.y += dy;
    } else if (copy.type === 'text') {
      const t = copy as TextEntity;
      t.position.x += dx; t.position.y += dy;
    } else if (copy.type === 'hatch') {
      const h = copy as any;
      h.boundary = h.boundary.map((p: Point2D) => ({ x: p.x + dx, y: p.y + dy }));
    }
    return copy;
  }

  // ---------------------------------------------------------------------------
  // AutoCAD Grip Points (Small blue/cyan squares on selected vertices)
  // ---------------------------------------------------------------------------
  private buildGrips(ent: CADEntity): THREE.Object3D | null {
    const pts: Point2D[] = [];
    if (ent.type === 'line') {
      const line = ent as any;
      pts.push(line.start, { x: (line.start.x + line.end.x) / 2, y: (line.start.y + line.end.y) / 2 }, line.end);
    } else if (ent.type === 'circle') {
      const c = ent as any;
      pts.push(
        c.center,
        { x: c.center.x + c.radius, y: c.center.y },
        { x: c.center.x - c.radius, y: c.center.y },
        { x: c.center.x, y: c.center.y + c.radius },
        { x: c.center.x, y: c.center.y - c.radius }
      );
    } else if (ent.type === 'rectangle') {
      const r = ent as any;
      pts.push(
        r.origin,
        { x: r.origin.x + r.width, y: r.origin.y },
        { x: r.origin.x + r.width, y: r.origin.y + r.height },
        { x: r.origin.x, y: r.origin.y + r.height },
        { x: r.origin.x + r.width / 2, y: r.origin.y + r.height / 2 }
      );
    } else if (ent.type === 'polyline') {
      const poly = ent as any;
      pts.push(...(poly.points || []));
    } else if (ent.type === 'spline') {
      const spl = ent as any;
      pts.push(...(spl.controlPoints || []));
    } else if (ent.type === 'ellipse') {
      const el = ent as any;
      const cosR = Math.cos(el.rotation || 0);
      const sinR = Math.sin(el.rotation || 0);
      pts.push(
        el.center,
        { x: el.center.x + el.radiusX * cosR, y: el.center.y + el.radiusX * sinR },
        { x: el.center.x - el.radiusX * cosR, y: el.center.y - el.radiusX * sinR },
        { x: el.center.x - el.radiusY * sinR, y: el.center.y + el.radiusY * cosR },
        { x: el.center.x + el.radiusY * sinR, y: el.center.y - el.radiusY * cosR }
      );
    } else if (ent.type === 'hatch') {
      const h = ent as any;
      pts.push(...(h.boundary || []));
      pts.push(PolygonBooleanUtils.calculateCentroid(h.boundary || []));
    }

    if (pts.length === 0) return null;

    const zoom = this.viewport.getState().zoom;
    const gripSize = 5 / zoom; // 5 screen pixels size

    const positions: number[] = [];
    for (const p of pts) {
      const s = gripSize;
      positions.push(
        p.x - s, p.y - s, 25, p.x + s, p.y - s, 25,
        p.x + s, p.y - s, 25, p.x + s, p.y + s, 25,
        p.x + s, p.y + s, 25, p.x - s, p.y + s, 25,
        p.x - s, p.y + s, 25, p.x - s, p.y - s, 25
      );
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const gripMat = new THREE.LineBasicMaterial({ color: 0x007acc, linewidth: 2 });
    return new THREE.LineSegments(geom, gripMat);
  }

  // ---------------------------------------------------------------------------
  // Text Sprite Builder
  // ---------------------------------------------------------------------------
  private buildTextSprite(txt: any): THREE.Object3D {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = Math.max(16, txt.fontSize || 16);
    canvas.width = 512;
    canvas.height = 128;

    ctx.fillStyle = txt.color || '#abb2bf';
    ctx.font = `${fontSize * 2}px monospace`;
    ctx.fillText(txt.text || '', 10, fontSize * 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);

    const aspect = canvas.width / canvas.height;
    const worldHeight = (txt.fontSize || 14);
    const worldWidth = worldHeight * aspect;

    sprite.scale.set(worldWidth, worldHeight, 1);
    sprite.position.set(txt.position.x + worldWidth / 2, txt.position.y - worldHeight / 2, 6);
    return sprite;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const obj = group.children[0] as any;
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: any) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }

  private getOrCreateLineMaterial(hex: number): THREE.LineBasicMaterial {
    const key = hex.toString(16);
    if (!this.lineMaterials.has(key)) {
      this.lineMaterials.set(key, new THREE.LineBasicMaterial({ color: hex, linewidth: 1.5 }));
    }
    return this.lineMaterials.get(key)!;
  }

  private parseColorToHex(color: string): number {
    if (color.startsWith('#')) {
      return parseInt(color.slice(1), 16);
    }
    return 0xffffff;
  }
}
