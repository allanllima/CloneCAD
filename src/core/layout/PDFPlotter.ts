import { jsPDF } from 'jspdf';
import {
  CADLayout,
  LayoutViewport,
  PlotConfig,
  PenStyle,
  STANDARD_PAPER_SIZES,
} from './LayoutTypes';
import { LayoutManager } from './LayoutManager';
import { PlotStyleManager } from './PlotStyleManager';
import {
  CADEntity,
  CADLayer,
  Point2D,
  BoundingBox2D,
  LineEntity,
  CircleEntity,
  ArcEntity,
  RectangleEntity,
  PolylineEntity,
  TextEntity,
  DimensionEntity,
  MultileaderEntity,
  BlockReferenceEntity,
  CADBlockDefinition,
} from '../types';
import { BulgeUtils } from '../geometry/BulgeUtils';
import { SplineUtils } from '../geometry/SplineUtils';
import { EllipseUtils } from '../geometry/EllipseUtils';
import { HatchUtils } from '../geometry/HatchUtils';

export class PDFPlotter {
  private layoutManager: LayoutManager;
  private plotStyleManager: PlotStyleManager;

  constructor(layoutManager: LayoutManager, plotStyleManager: PlotStyleManager) {
    this.layoutManager = layoutManager;
    this.plotStyleManager = plotStyleManager;
  }

  /**
   * Generates a vector PDF Blob/document for a Layout or Model Space
   */
  public plotToPDF(
    config: PlotConfig,
    entities: CADEntity[],
    layers: CADLayer[],
    blockResolver?: (name: string) => CADBlockDefinition | undefined
  ): jsPDF {
    const layout = config.layoutId ? this.layoutManager.getLayout(config.layoutId) : undefined;
    const paperDims = layout
      ? this.layoutManager.getPaperDimensions(layout)
      : this.layoutManager.getDimensionsForPaper(config.paperSize, config.orientation, config.customDimensions);

    const isLandscape = paperDims.width >= paperDims.height;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [paperDims.width, paperDims.height],
      compress: true,
    });

    if (layout) {
      this.renderLayoutToPDF(doc, layout, paperDims, entities, layers, blockResolver);
    } else {
      this.renderModelSpaceToPDF(doc, config, paperDims, entities, layers, blockResolver);
    }

    return doc;
  }

  /**
   * Generates downloadable PDF file directly in the browser
   */
  public downloadPDF(
    config: PlotConfig,
    entities: CADEntity[],
    layers: CADLayer[],
    blockResolver?: (name: string) => CADBlockDefinition | undefined
  ): void {
    const doc = this.plotToPDF(config, entities, layers, blockResolver);
    const fileName = config.fileName || `CloneCAD_Plot_${Date.now()}.pdf`;
    doc.save(fileName);
  }

  // ---------------------------------------------------------------------------
  // Paper Space Layout Rendering
  // ---------------------------------------------------------------------------

  private renderLayoutToPDF(
    doc: jsPDF,
    layout: CADLayout,
    paperDims: { width: number; height: number },
    modelEntities: CADEntity[],
    layers: CADLayer[],
    blockResolver?: (name: string) => CADBlockDefinition | undefined
  ): void {
    const H = paperDims.height;
    const W = paperDims.width;

    // Helper: convert paper mm (bottom-left origin) to PDF mm (top-left origin)
    const toPdfY = (paperY: number) => H - paperY;

    // 1. Draw Paper Border & Margins (ABNT NBR 10068)
    const m = layout.margins;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5); // 0.5mm outer border
    // Printable margin border
    doc.rect(m.left, m.top, W - m.left - m.right, H - m.top - m.bottom);

    // 2. Render Title Block (Carimbo) if defined
    if (layout.titleBlock) {
      this.renderTitleBlockPDF(doc, layout.titleBlock, W, H, m);
    }

    // 3. Render Floating Viewports
    for (const vp of layout.viewports) {
      // Draw Viewport Frame (thin border)
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.18);
      const vpPdfY = toPdfY(vp.y + vp.height);
      doc.rect(vp.x, vpPdfY, vp.width, vp.height);

      // Render Viewport Title Tag
      if (vp.title) {
        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        doc.text(vp.title, vp.x, vpPdfY - 2);
      }

      // Filter entities visible in this viewport
      const visibleEntities = modelEntities.filter((ent) => {
        if (!ent.visible) return false;
        const layer = layers.find((l) => l.id === ent.layerId);
        if (layer && !layer.visible) return false;
        return this.layoutManager.isLayerVisibleInViewport(vp, ent.layerId);
      });

      // Transform & draw each entity mapped to this viewport
      for (const ent of visibleEntities) {
        const pen = this.resolvePen(layout.plotStyleTable, ent, layers);
        this.renderEntityToViewportPDF(doc, ent, vp, toPdfY, pen, blockResolver);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Model Space Direct Rendering (Window / Extents / Display)
  // ---------------------------------------------------------------------------

  private renderModelSpaceToPDF(
    doc: jsPDF,
    config: PlotConfig,
    paperDims: { width: number; height: number },
    modelEntities: CADEntity[],
    layers: CADLayer[],
    blockResolver?: (name: string) => CADBlockDefinition | undefined
  ): void {
    const margin = 10;
    const availW = paperDims.width - margin * 2;
    const availH = paperDims.height - margin * 2;

    // Calculate extents of model entities
    let bounds: BoundingBox2D = config.windowBox || {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };

    if (!config.windowBox) {
      for (const ent of modelEntities) {
        if (!ent.visible) continue;
        const b = this.getEntityBounds(ent);
        if (b) {
          bounds.minX = Math.min(bounds.minX, b.minX);
          bounds.minY = Math.min(bounds.minY, b.minY);
          bounds.maxX = Math.max(bounds.maxX, b.maxX);
          bounds.maxY = Math.max(bounds.maxY, b.maxY);
        }
      }
    }

    if (!isFinite(bounds.minX)) {
      bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    }

    const modelW = Math.max(bounds.maxX - bounds.minX, 1);
    const modelH = Math.max(bounds.maxY - bounds.minY, 1);

    const scale = config.fitToPage
      ? Math.min(availW / modelW, availH / modelH)
      : config.scale || 0.02;

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const paperCenterX = paperDims.width / 2;
    const paperCenterY = paperDims.height / 2;

    const transformPt = (p: Point2D): Point2D => ({
      x: paperCenterX + (p.x - centerX) * scale,
      y: paperCenterY - (p.y - centerY) * scale, // PDF Y is inverted (+Y down)
    });

    for (const ent of modelEntities) {
      if (!ent.visible) continue;
      const layer = layers.find((l) => l.id === ent.layerId);
      if (layer && !layer.visible) continue;

      const pen = this.resolvePen(config.plotStyleTable, ent, layers);
      this.renderEntityTransformedPDF(doc, ent, transformPt, scale, pen, blockResolver);
    }
  }

  // ---------------------------------------------------------------------------
  // Entity Rendering onto PDF Canvas
  // ---------------------------------------------------------------------------

  private renderEntityToViewportPDF(
    doc: jsPDF,
    ent: CADEntity,
    vp: LayoutViewport,
    toPdfY: (py: number) => number,
    pen: PenStyle,
    blockResolver?: (name: string) => CADBlockDefinition | undefined
  ): void {
    const transformPt = (modelPt: Point2D): Point2D => {
      const paperPt = this.layoutManager.modelToPaper(vp, modelPt);
      return {
        x: paperPt.x,
        y: toPdfY(paperPt.y),
      };
    };

    // Viewport clipping bounds in PDF coordinates
    const minX = vp.x;
    const maxX = vp.x + vp.width;
    const minY = toPdfY(vp.y + vp.height);
    const maxY = toPdfY(vp.y);

    this.renderEntityTransformedPDF(
      doc,
      ent,
      transformPt,
      vp.scale,
      pen,
      blockResolver,
      { minX, maxX, minY, maxY }
    );
  }

  private renderEntityTransformedPDF(
    doc: jsPDF,
    ent: CADEntity,
    transform: (p: Point2D) => Point2D,
    scale: number,
    pen: PenStyle,
    blockResolver?: (name: string) => CADBlockDefinition | undefined,
    clipBounds?: { minX: number; maxX: number; minY: number; maxY: number }
  ): void {
    const [r, g, b] = this.hexToRgb(pen.color);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(Math.max(0.05, pen.lineWeight));

    switch (ent.type) {
      case 'line': {
        const line = ent as LineEntity;
        const p1 = transform(line.start);
        const p2 = transform(line.end);
        doc.line(p1.x, p1.y, p2.x, p2.y);
        break;
      }

      case 'circle': {
        const circle = ent as CircleEntity;
        const c = transform(circle.center);
        const rMm = circle.radius * scale;
        doc.circle(c.x, c.y, rMm, 'S');
        break;
      }

      case 'arc': {
        const arc = ent as ArcEntity;
        const c = transform(arc.center);
        const rMm = arc.radius * scale;
        // Sample arc as small line segments
        const segs = 32;
        let diff = arc.endAngle - arc.startAngle;
        if (diff < 0) diff += Math.PI * 2;
        let prev = {
          x: c.x + Math.cos(arc.startAngle) * rMm,
          y: c.y - Math.sin(arc.startAngle) * rMm,
        };
        for (let i = 1; i <= segs; i++) {
          const a = arc.startAngle + (diff * i) / segs;
          const curr = {
            x: c.x + Math.cos(a) * rMm,
            y: c.y - Math.sin(a) * rMm,
          };
          doc.line(prev.x, prev.y, curr.x, curr.y);
          prev = curr;
        }
        break;
      }

      case 'rectangle': {
        const rect = ent as RectangleEntity;
        const p1 = transform(rect.origin);
        const p2 = transform({ x: rect.origin.x + rect.width, y: rect.origin.y });
        const p3 = transform({ x: rect.origin.x + rect.width, y: rect.origin.y + rect.height });
        const p4 = transform({ x: rect.origin.x, y: rect.origin.y + rect.height });
        doc.line(p1.x, p1.y, p2.x, p2.y);
        doc.line(p2.x, p2.y, p3.x, p3.y);
        doc.line(p3.x, p3.y, p4.x, p4.y);
        doc.line(p4.x, p4.y, p1.x, p1.y);
        break;
      }

      case 'polyline': {
        const pl = ent as PolylineEntity;
        if (pl.points.length < 2) break;
        for (let i = 0; i < pl.points.length - 1; i++) {
          const ptA = pl.points[i];
          const ptB = pl.points[i + 1];
          if (ptA.bulge && Math.abs(ptA.bulge) > 1e-4) {
            const arcPts = BulgeUtils.samplePoints(ptA, ptB, ptA.bulge, 16);
            for (let k = 0; k < arcPts.length - 1; k++) {
              const pa = transform(arcPts[k]);
              const pb = transform(arcPts[k + 1]);
              doc.line(pa.x, pa.y, pb.x, pb.y);
            }
          } else {
            const pa = transform(ptA);
            const pb = transform(ptB);
            doc.line(pa.x, pa.y, pb.x, pb.y);
          }
        }
        if (pl.closed && pl.points.length > 2) {
          const last = pl.points[pl.points.length - 1];
          const first = pl.points[0];
          const pa = transform(last);
          const pb = transform(first);
          doc.line(pa.x, pa.y, pb.x, pb.y);
        }
        break;
      }

      case 'spline': {
        const sp = ent as any;
        const sampled = SplineUtils.sampleSpline(sp.controlPoints, sp.closed, 16);
        for (let i = 0; i < sampled.length - 1; i++) {
          const pa = transform(sampled[i]);
          const pb = transform(sampled[i + 1]);
          doc.line(pa.x, pa.y, pb.x, pb.y);
        }
        break;
      }

      case 'ellipse': {
        const el = ent as any;
        const sampled = EllipseUtils.sampleEllipse(el.center, el.radiusX, el.radiusY, el.rotation, 36);
        for (let i = 0; i < sampled.length - 1; i++) {
          const pa = transform(sampled[i]);
          const pb = transform(sampled[i + 1]);
          doc.line(pa.x, pa.y, pb.x, pb.y);
        }
        break;
      }

      case 'hatch': {
        const ht = ent as any;
        const lines = HatchUtils.generatePatternLines(ht.polygon, ht.pattern, ht.scale || 10, ht.angle || 0);
        for (const hl of lines) {
          const pa = transform(hl.start);
          const pb = transform(hl.end);
          doc.line(pa.x, pa.y, pb.x, pb.y);
        }
        break;
      }

      case 'text': {
        const te = ent as TextEntity;
        const p = transform(te.position);
        doc.setFontSize(Math.max(6, Math.min(24, (te.fontSize || 12) * scale * 2)));
        doc.setTextColor(r, g, b);
        doc.text(te.text, p.x, p.y);
        break;
      }

      case 'dimension': {
        const dim = ent as DimensionEntity;
        const p1 = transform(dim.defPoint1 || { x: 0, y: 0 });
        const p2 = transform(dim.defPoint2 || { x: 10, y: 0 });
        doc.line(p1.x, p1.y, p2.x, p2.y);
        const label = dim.textOverride || dim.measurement?.toFixed(2) || '';
        if (label) {
          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          doc.setFontSize(7);
          doc.setTextColor(r, g, b);
          doc.text(label, mid.x, mid.y - 1);
        }
        break;
      }

      case 'multileader': {
        const ml = ent as MultileaderEntity;
        const pa = transform(ml.arrowPoint);
        const pl = transform(ml.landingPoint);
        doc.line(pa.x, pa.y, pl.x, pl.y);
        if (ml.text) {
          doc.setFontSize(8);
          doc.setTextColor(r, g, b);
          doc.text(ml.text, pl.x + 2, pl.y);
        }
        break;
      }

      case 'insert': {
        const ref = ent as BlockReferenceEntity;
        if (blockResolver) {
          const def = blockResolver(ref.blockName);
          if (def) {
            // Render block entities transformed
            for (const sub of def.entities) {
              const subCopy = { ...sub, layerId: ref.layerId };
              this.renderEntityTransformedPDF(doc, subCopy, (p) => {
                const worldX = ref.position.x + p.x * ref.scale.x;
                const worldY = ref.position.y + p.y * ref.scale.y;
                return transform({ x: worldX, y: worldY });
              }, scale, pen, blockResolver, clipBounds);
            }
          }
        }
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Engineering Title Block (Carimbo ABNT)
  // ---------------------------------------------------------------------------

  private renderTitleBlockPDF(
    doc: jsPDF,
    tb: NonNullable<CADLayout['titleBlock']>,
    W: number,
    H: number,
    margins: CADLayout['margins']
  ): void {
    const boxW = 175; // Standard 175mm ABNT title block width
    const boxH = 50;  // Standard 50mm height
    const x0 = W - margins.right - boxW;
    const y0 = H - margins.bottom - boxH;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(x0, y0, boxW, boxH);

    // Inner dividing lines
    doc.setLineWidth(0.25);
    doc.line(x0, y0 + 15, x0 + boxW, y0 + 15);
    doc.line(x0, y0 + 32, x0 + boxW, y0 + 32);
    doc.line(x0 + 110, y0 + 32, x0 + 110, y0 + boxH);
    doc.line(x0 + 145, y0 + 32, x0 + 145, y0 + boxH);

    // Text details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(tb.project, x0 + 3, y0 + 6);

    doc.setFontSize(11);
    doc.text(tb.title, x0 + 3, y0 + 24);

    doc.setFontSize(7);
    doc.text(`ESCALA: ${tb.scale}`, x0 + 3, y0 + 40);
    doc.text(`DATA: ${tb.date}`, x0 + 3, y0 + 46);
    doc.text(`DESENHO: ${tb.drawnBy}`, x0 + 55, y0 + 40);
    doc.text(`REV: ${tb.revision}`, x0 + 113, y0 + 42);
    doc.text(`FOLHA: ${tb.sheetNumber}/${tb.totalSheets}`, x0 + 148, y0 + 42);
  }

  // ---------------------------------------------------------------------------
  // SVG Vector Generation
  // ---------------------------------------------------------------------------

  public generateSVG(
    config: PlotConfig,
    entities: CADEntity[],
    layers: CADLayer[],
    blockResolver?: (name: string) => CADBlockDefinition | undefined
  ): string {
    const layout = config.layoutId ? this.layoutManager.getLayout(config.layoutId) : undefined;
    const dims = layout
      ? this.layoutManager.getPaperDimensions(layout)
      : this.layoutManager.getDimensionsForPaper(config.paperSize, config.orientation, config.customDimensions);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dims.width} ${dims.height}" width="${dims.width}mm" height="${dims.height}mm" style="background-color: #ffffff;">\n`;
    svg += `  <rect x="0" y="0" width="${dims.width}" height="${dims.height}" fill="#ffffff" stroke="#dddddd" stroke-width="0.5"/>\n`;

    if (layout) {
      const m = layout.margins;
      svg += `  <rect x="${m.left}" y="${m.top}" width="${dims.width - m.left - m.right}" height="${dims.height - m.top - m.bottom}" fill="none" stroke="#000000" stroke-width="0.5"/>\n`;

      for (const vp of layout.viewports) {
        const vpY = dims.height - (vp.y + vp.height);
        svg += `  <!-- Viewport ${vp.id} -->\n`;
        svg += `  <rect x="${vp.x}" y="${vpY}" width="${vp.width}" height="${vp.height}" fill="none" stroke="#999999" stroke-width="0.25"/>\n`;

        const visible = entities.filter((e) => e.visible && this.layoutManager.isLayerVisibleInViewport(vp, e.layerId));
        for (const ent of visible) {
          const pen = this.resolvePen(layout.plotStyleTable, ent, layers);
          svg += this.entityToSVG(ent, (p) => {
            const paperPt = this.layoutManager.modelToPaper(vp, p);
            return { x: paperPt.x, y: dims.height - paperPt.y };
          }, vp.scale, pen);
        }
      }
    }

    svg += '</svg>';
    return svg;
  }

  private entityToSVG(
    ent: CADEntity,
    transform: (p: Point2D) => Point2D,
    scale: number,
    pen: PenStyle
  ): string {
    if (ent.type === 'line') {
      const l = ent as LineEntity;
      const p1 = transform(l.start);
      const p2 = transform(l.end);
      return `  <line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="${pen.color}" stroke-width="${pen.lineWeight}"/>\n`;
    } else if (ent.type === 'circle') {
      const c = ent as CircleEntity;
      const pt = transform(c.center);
      return `  <circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="${(c.radius * scale).toFixed(2)}" fill="none" stroke="${pen.color}" stroke-width="${pen.lineWeight}"/>\n`;
    }
    return '';
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private resolvePen(tableId: string, ent: CADEntity, layers: CADLayer[]): PenStyle {
    const layer = layers.find((l) => l.id === ent.layerId);
    return this.plotStyleManager.resolvePenStyle(
      tableId,
      ent.color,
      ent.layerId,
      layer?.color,
      ent.lineWeight || layer?.lineWeight
    );
  }

  private hexToRgb(hex: string): [number, number, number] {
    if (!hex || hex === 'object_color') return [0, 0, 0];
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    if (clean.length !== 6) return [0, 0, 0];
    return [
      parseInt(clean.substring(0, 2), 16) || 0,
      parseInt(clean.substring(2, 4), 16) || 0,
      parseInt(clean.substring(4, 6), 16) || 0,
    ];
  }

  private getEntityBounds(ent: CADEntity): BoundingBox2D | null {
    if (ent.type === 'line') {
      const l = ent as LineEntity;
      return {
        minX: Math.min(l.start.x, l.end.x),
        maxX: Math.max(l.start.x, l.end.x),
        minY: Math.min(l.start.y, l.end.y),
        maxY: Math.max(l.start.y, l.end.y),
      };
    } else if (ent.type === 'circle') {
      const c = ent as CircleEntity;
      return {
        minX: c.center.x - c.radius,
        maxX: c.center.x + c.radius,
        minY: c.center.y - c.radius,
        maxY: c.center.y + c.radius,
      };
    } else if (ent.type === 'rectangle') {
      const r = ent as RectangleEntity;
      return {
        minX: r.origin.x,
        maxX: r.origin.x + r.width,
        minY: r.origin.y,
        maxY: r.origin.y + r.height,
      };
    }
    return null;
  }
}
