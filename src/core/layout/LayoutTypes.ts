import { Point2D, BoundingBox2D, CADEntity } from '../types';

export type PaperSize = 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'CUSTOM';
export type PaperOrientation = 'landscape' | 'portrait';

export interface PaperDimensions {
  width: number;  // in millimeters
  height: number; // in millimeters
}

export const STANDARD_PAPER_SIZES: Record<Exclude<PaperSize, 'CUSTOM'>, PaperDimensions> = {
  A0: { width: 1189, height: 841 },
  A1: { width: 841, height: 594 },
  A2: { width: 594, height: 420 },
  A3: { width: 420, height: 297 },
  A4: { width: 210, height: 297 },
};

/**
 * Standard ABNT NBR 10068 margins in millimeters
 * Left margin: 25mm (standard binding margin)
 * Top, Right, Bottom: 10mm (for A0, A1) or 7mm (for A2, A3, A4)
 */
export interface PageMargins {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function getDefaultMarginsForPaper(paperSize: PaperSize): PageMargins {
  if (paperSize === 'A0' || paperSize === 'A1') {
    return { left: 25, top: 10, right: 10, bottom: 10 };
  }
  return { left: 25, top: 7, right: 7, bottom: 7 };
}

/**
 * Engineering Title Block (Carimbo / Selo Técnico da Folha)
 */
export interface LayoutTitleBlock {
  title: string;
  project: string;
  client?: string;
  sheetNumber: string;
  totalSheets: string;
  scale: string;
  date: string;
  drawnBy: string;
  checkedBy?: string;
  revision: string;
}

/**
 * Technical Standard CAD Scale definitions
 */
export interface StandardScale {
  name: string;
  ratio: number; // e.g. 1:50 -> 1/50 = 0.02
}

export const STANDARD_SCALES: StandardScale[] = [
  { name: '1:1', ratio: 1.0 },
  { name: '1:2', ratio: 0.5 },
  { name: '1:5', ratio: 0.2 },
  { name: '1:10', ratio: 0.1 },
  { name: '1:20', ratio: 0.05 },
  { name: '1:25', ratio: 0.04 },
  { name: '1:50', ratio: 0.02 },
  { name: '1:75', ratio: 1 / 75 },
  { name: '1:100', ratio: 0.01 },
  { name: '1:125', ratio: 1 / 125 },
  { name: '1:200', ratio: 0.005 },
  { name: '1:250', ratio: 0.004 },
  { name: '1:500', ratio: 0.002 },
  { name: '1:1000', ratio: 0.001 },
];

/**
 * Floating Viewport in Paper Space (MVIEW)
 */
export interface LayoutViewport {
  id: string;
  // Position & dimension on sheet in paper millimeters
  x: number;
  y: number;
  width: number;
  height: number;
  // Model Space framing
  viewCenter: Point2D; // center point in Model Space world coordinates
  scale: number;       // scale factor: paper mm / model unit (e.g. 1:50 -> 0.02)
  scaleName: string;   // e.g. "1:50"
  rotation: number;    // rotation in radians (default 0)
  frozenLayers: string[]; // VP Freeze: layer IDs invisible in this viewport
  locked: boolean;     // whether pan/zoom is locked inside viewport
  title?: string;      // label e.g. "PLANTA BAIXA - ESCALA 1:50"
}

/**
 * Layout (Paper Space sheet)
 */
export interface CADLayout {
  id: string;
  name: string;
  paperSize: PaperSize;
  customDimensions?: PaperDimensions;
  orientation: PaperOrientation;
  margins: PageMargins;
  plotStyleTable: string; // e.g. 'monochrome.ctb' | 'grayscale.ctb' | 'acad.ctb' | 'architectural.ctb'
  viewports: LayoutViewport[];
  paperEntities: CADEntity[]; // annotations, borders drawn directly on sheet in mm
  titleBlock?: LayoutTitleBlock;
}

// ---------------------------------------------------------------------------
// Plot Style Tables (CTB / STB)
// ---------------------------------------------------------------------------

export type PlotStyleType = 'monochrome' | 'grayscale' | 'color' | 'architectural' | 'custom';

export interface PenStyle {
  color: string;       // printed hex color or 'object_color'
  lineWeight: number;  // in millimeters (e.g., 0.13, 0.18, 0.25, 0.35, 0.50, 0.70)
  screening: number;   // 0 to 100%
}

export interface PlotStyleTable {
  id: string;
  name: string;
  description: string;
  type: PlotStyleType;
  defaultPen: PenStyle;
  colorMap?: Record<string, PenStyle>; // mapping by hex or color index
  layerMap?: Record<string, PenStyle>; // mapping by layer ID
}

// ---------------------------------------------------------------------------
// Plotting & PDF Export Configurations
// ---------------------------------------------------------------------------

export type PlotArea = 'layout' | 'extents' | 'display' | 'window';

export interface PlotConfig {
  layoutId?: string; // if plotting paper space
  plotArea: PlotArea;
  windowBox?: BoundingBox2D; // if plotArea === 'window'
  paperSize: PaperSize;
  customDimensions?: PaperDimensions;
  orientation: PaperOrientation;
  plotStyleTable: string;
  fitToPage: boolean;
  scale?: number; // e.g. 1 (1:1), 0.02 (1:50)
  centerPlot: boolean;
  fileName?: string;
  dpi?: number;
}
