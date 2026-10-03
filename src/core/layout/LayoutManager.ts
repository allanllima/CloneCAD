import {
  CADLayout,
  LayoutViewport,
  PaperSize,
  PaperOrientation,
  PaperDimensions,
  STANDARD_PAPER_SIZES,
  getDefaultMarginsForPaper,
  STANDARD_SCALES,
} from './LayoutTypes';
import { Point2D, BoundingBox2D, CADEntity } from '../types';

export class LayoutManager {
  private layouts: Map<string, CADLayout> = new Map();
  private activeSpace: 'model' | string = 'model';
  private activeViewportId: string | null = null;
  private onLayoutChanged?: () => void;

  constructor(onLayoutChanged?: () => void) {
    this.onLayoutChanged = onLayoutChanged;
    this.createDefaultLayouts();
  }

  private createDefaultLayouts(): void {
    // 1. Layout 1: A1 Landscape (Standard Architectural Sheet)
    const layout1: CADLayout = {
      id: 'layout_1',
      name: 'Layout 1 (A1)',
      paperSize: 'A1',
      orientation: 'landscape',
      margins: getDefaultMarginsForPaper('A1'),
      plotStyleTable: 'architectural.ctb',
      viewports: [
        {
          id: 'vp_1',
          x: 35,
          y: 20,
          width: 770,
          height: 480,
          viewCenter: { x: 0, y: 0 },
          scale: 0.02, // 1:50
          scaleName: '1:50',
          rotation: 0,
          frozenLayers: [],
          locked: false,
          title: 'PLANTA BAIXA - ESCALA 1:50',
        },
      ],
      paperEntities: [],
      titleBlock: {
        title: 'PROJETO ARQUITETÔNICO RESIDENCIAL',
        project: 'EDIFÍCIO RESIDENCIAL HORIZONTE',
        client: 'CLIENTE PADRÃO',
        sheetNumber: '01',
        totalSheets: '02',
        scale: '1:50',
        date: new Date().toLocaleDateString('pt-BR'),
        drawnBy: 'CLONECAD',
        checkedBy: 'ENG. RESPONSÁVEL',
        revision: 'R00',
      },
    };

    // 2. Layout 2: A3 Landscape (Standard Details Sheet)
    const layout2: CADLayout = {
      id: 'layout_2',
      name: 'Layout 2 (A3)',
      paperSize: 'A3',
      orientation: 'landscape',
      margins: getDefaultMarginsForPaper('A3'),
      plotStyleTable: 'monochrome.ctb',
      viewports: [
        {
          id: 'vp_2',
          x: 35,
          y: 15,
          width: 360,
          height: 230,
          viewCenter: { x: 0, y: 0 },
          scale: 0.01, // 1:100
          scaleName: '1:100',
          rotation: 0,
          frozenLayers: [],
          locked: false,
          title: 'IMPLANTAÇÃO GERAL - ESCALA 1:100',
        },
      ],
      paperEntities: [],
      titleBlock: {
        title: 'DETALHAMENTO E IMPLANTAÇÃO',
        project: 'EDIFÍCIO RESIDENCIAL HORIZONTE',
        sheetNumber: '02',
        totalSheets: '02',
        scale: '1:100',
        date: new Date().toLocaleDateString('pt-BR'),
        drawnBy: 'CLONECAD',
        revision: 'R00',
      },
    };

    this.layouts.set(layout1.id, layout1);
    this.layouts.set(layout2.id, layout2);
  }

  public getLayout(id: string): CADLayout | undefined {
    return this.layouts.get(id);
  }

  public getAllLayouts(): CADLayout[] {
    return Array.from(this.layouts.values());
  }

  public getActiveSpace(): 'model' | string {
    return this.activeSpace;
  }

  public isModelSpace(): boolean {
    return this.activeSpace === 'model';
  }

  public getActiveLayout(): CADLayout | undefined {
    if (this.activeSpace === 'model') return undefined;
    return this.layouts.get(this.activeSpace);
  }

  public setActiveSpace(space: 'model' | string): void {
    if (space === 'model') {
      this.activeSpace = 'model';
      this.activeViewportId = null;
    } else if (this.layouts.has(space)) {
      this.activeSpace = space;
      this.activeViewportId = null;
    }
    this.onLayoutChanged?.();
  }

  public getActiveViewportId(): string | null {
    return this.activeViewportId;
  }

  public setActiveViewportId(vpId: string | null): void {
    this.activeViewportId = vpId;
    this.onLayoutChanged?.();
  }

  public createLayout(options: Partial<CADLayout> = {}): CADLayout {
    const id = options.id || `layout_${Date.now()}`;
    const paperSize: PaperSize = options.paperSize || 'A3';
    const orientation: PaperOrientation = options.orientation || 'landscape';
    const margins = options.margins || getDefaultMarginsForPaper(paperSize);

    const dims = this.getDimensionsForPaper(paperSize, orientation, options.customDimensions);
    const vpMarginLeft = margins.left + 10;
    const vpMarginBottom = margins.bottom + 10;
    const vpWidth = Math.max(50, dims.width - vpMarginLeft - margins.right - 10);
    const vpHeight = Math.max(50, dims.height - vpMarginBottom - margins.top - 10);

    const newLayout: CADLayout = {
      id,
      name: options.name || `Layout ${this.layouts.size + 1}`,
      paperSize,
      customDimensions: options.customDimensions,
      orientation,
      margins,
      plotStyleTable: options.plotStyleTable || 'monochrome.ctb',
      viewports: options.viewports || [
        {
          id: `vp_${Date.now()}`,
          x: vpMarginLeft,
          y: vpMarginBottom,
          width: vpWidth,
          height: vpHeight,
          viewCenter: { x: 0, y: 0 },
          scale: 0.02,
          scaleName: '1:50',
          rotation: 0,
          frozenLayers: [],
          locked: false,
          title: 'VISTA GERAL',
        },
      ],
      paperEntities: options.paperEntities || [],
      titleBlock: options.titleBlock || {
        title: 'NOVA PRANCHA TÉCNICA',
        project: 'PROJETO PADRÃO',
        sheetNumber: `0${this.layouts.size + 1}`,
        totalSheets: `0${this.layouts.size + 1}`,
        scale: '1:50',
        date: new Date().toLocaleDateString('pt-BR'),
        drawnBy: 'CLONECAD',
        revision: 'R00',
      },
    };

    this.layouts.set(newLayout.id, newLayout);
    this.onLayoutChanged?.();
    return newLayout;
  }

  public updateLayout(id: string, updates: Partial<CADLayout>): CADLayout | undefined {
    const layout = this.layouts.get(id);
    if (!layout) return undefined;

    const updated = { ...layout, ...updates };
    this.layouts.set(id, updated);
    this.onLayoutChanged?.();
    return updated;
  }

  public deleteLayout(id: string): boolean {
    if (this.layouts.size <= 1) return false; // keep at least 1 layout
    const deleted = this.layouts.delete(id);
    if (deleted) {
      if (this.activeSpace === id) {
        this.activeSpace = Array.from(this.layouts.keys())[0] || 'model';
      }
      this.onLayoutChanged?.();
    }
    return deleted;
  }

  // ---------------------------------------------------------------------------
  // Viewport Operations
  // ---------------------------------------------------------------------------

  public addViewport(layoutId: string, vpData: Omit<LayoutViewport, 'id'>): LayoutViewport | null {
    const layout = this.layouts.get(layoutId);
    if (!layout) return null;

    const vp: LayoutViewport = {
      ...vpData,
      id: `vp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    layout.viewports.push(vp);
    this.onLayoutChanged?.();
    return vp;
  }

  public updateViewport(
    layoutId: string,
    vpId: string,
    updates: Partial<LayoutViewport>
  ): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const idx = layout.viewports.findIndex((v) => v.id === vpId);
    if (idx === -1) return false;

    layout.viewports[idx] = { ...layout.viewports[idx], ...updates };
    this.onLayoutChanged?.();
    return true;
  }

  public removeViewport(layoutId: string, vpId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const initLen = layout.viewports.length;
    layout.viewports = layout.viewports.filter((v) => v.id !== vpId);
    if (layout.viewports.length !== initLen) {
      if (this.activeViewportId === vpId) {
        this.activeViewportId = null;
      }
      this.onLayoutChanged?.();
      return true;
    }
    return false;
  }

  public setVPFreeze(
    layoutId: string,
    vpId: string,
    layerId: string,
    frozen: boolean
  ): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    const vp = layout.viewports.find((v) => v.id === vpId);
    if (!vp) return false;

    if (frozen) {
      if (!vp.frozenLayers.includes(layerId)) {
        vp.frozenLayers.push(layerId);
      }
    } else {
      vp.frozenLayers = vp.frozenLayers.filter((id) => id !== layerId);
    }
    this.onLayoutChanged?.();
    return true;
  }

  public isLayerVisibleInViewport(vp: LayoutViewport, layerId: string): boolean {
    return !vp.frozenLayers.includes(layerId);
  }

  // ---------------------------------------------------------------------------
  // Geometric & Coordinate Calculations (Paper Space mm <-> Model Space)
  // ---------------------------------------------------------------------------

  public getDimensionsForPaper(
    paperSize: PaperSize,
    orientation: PaperOrientation,
    customDimensions?: PaperDimensions
  ): PaperDimensions {
    let base = customDimensions || (paperSize !== 'CUSTOM' ? STANDARD_PAPER_SIZES[paperSize] : { width: 297, height: 210 });
    const isLandscape = orientation === 'landscape';
    const w = Math.max(base.width, base.height);
    const h = Math.min(base.width, base.height);

    return isLandscape ? { width: w, height: h } : { width: h, height: w };
  }

  public getPaperDimensions(layout: CADLayout): PaperDimensions {
    return this.getDimensionsForPaper(layout.paperSize, layout.orientation, layout.customDimensions);
  }

  /**
   * Viewport center on the paper sheet in millimeters
   */
  public getViewportPaperCenter(vp: LayoutViewport): Point2D {
    return {
      x: vp.x + vp.width / 2,
      y: vp.y + vp.height / 2,
    };
  }

  /**
   * Transforms a point in Paper Space (mm from sheet origin) into Model Space coordinates
   */
  public paperToModel(vp: LayoutViewport, paperPt: Point2D): Point2D {
    const pCenter = this.getViewportPaperCenter(vp);
    const scale = vp.scale > 0 ? vp.scale : 0.02;

    const dx = (paperPt.x - pCenter.x) / scale;
    const dy = (paperPt.y - pCenter.y) / scale;

    const cosR = Math.cos(-vp.rotation);
    const sinR = Math.sin(-vp.rotation);

    return {
      x: vp.viewCenter.x + (dx * cosR - dy * sinR),
      y: vp.viewCenter.y + (dx * sinR + dy * cosR),
    };
  }

  /**
   * Transforms a point in Model Space into Paper Space (mm from sheet origin)
   */
  public modelToPaper(vp: LayoutViewport, modelPt: Point2D): Point2D {
    const pCenter = this.getViewportPaperCenter(vp);
    const scale = vp.scale > 0 ? vp.scale : 0.02;

    const dx = modelPt.x - vp.viewCenter.x;
    const dy = modelPt.y - vp.viewCenter.y;

    const cosR = Math.cos(vp.rotation);
    const sinR = Math.sin(vp.rotation);

    return {
      x: pCenter.x + (dx * cosR - dy * sinR) * scale,
      y: pCenter.y + (dx * sinR + dy * cosR) * scale,
    };
  }

  /**
   * Gets bounding box of Model Space framed by this viewport
   */
  public getModelFramingBounds(vp: LayoutViewport): BoundingBox2D {
    const halfW = (vp.width / (2 * vp.scale));
    const halfH = (vp.height / (2 * vp.scale));
    return {
      minX: vp.viewCenter.x - halfW,
      maxX: vp.viewCenter.x + halfW,
      minY: vp.viewCenter.y - halfH,
      maxY: vp.viewCenter.y + halfH,
    };
  }
}
