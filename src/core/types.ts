/**
 * Core Types & Contracts for CloneCAD Engine
 */

export interface Point2D {
  x: number;
  y: number;
}

export * from './layout/LayoutTypes';

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// -------------------------------------------------------------
// Plugin & Command Interfaces (Strictly as specified)
// -------------------------------------------------------------
export interface CADPlugin {
  id: string;
  name: string;
  version: string;
  icon?: string;
  category: 'draw' | 'modify' | 'annotation' | 'utility';
  init(core: CADCoreAPI): void;
  destroy?(): void;
}

export interface CADCommand {
  id: string;
  name?: string;
  execute(): void;
  undo(): void;
}

// -------------------------------------------------------------
// Layer & Entity Interfaces
// -------------------------------------------------------------
export interface CADLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  lineWeight?: number;
  lineType?: 'continuous' | 'dashed' | 'dotted';
}

export type EntityType =
  | 'line'
  | 'circle'
  | 'rectangle'
  | 'polyline'
  | 'arc'
  | 'text'
  | 'spline'
  | 'ellipse'
  | 'hatch'
  | 'image'
  | string;

export interface BaseEntity {
  id: string;
  type: EntityType;
  layerId: string;
  color?: string; // If undefined, inherits layer color
  lineWeight?: number;
  selected?: boolean;
  visible?: boolean;
}

export interface LineEntity extends BaseEntity {
  type: 'line';
  start: Point2D;
  end: Point2D;
}

export interface CircleEntity extends BaseEntity {
  type: 'circle';
  center: Point2D;
  radius: number;
}

export interface RectangleEntity extends BaseEntity {
  type: 'rectangle';
  origin: Point2D;
  width: number;
  height: number;
}

export interface PolylineVertex extends Point2D {
  bulge?: number; // DXF bulge = tan(sweep / 4). 0 = straight line.
}

export interface PolylineEntity extends BaseEntity {
  type: 'polyline';
  points: PolylineVertex[];
  vertices?: PolylineVertex[];
  closed: boolean;
}

export interface ArcEntity extends BaseEntity {
  type: 'arc';
  center: Point2D;
  radius: number;
  startAngle: number; // in radians
  endAngle: number;   // in radians
}

export interface TextEntity extends BaseEntity {
  type: 'text';
  position: Point2D;
  text: string;
  fontSize: number;
  rotation?: number; // radians
}

export interface SplineEntity extends BaseEntity {
  type: 'spline';
  controlPoints: Point2D[];
  degree?: number;
  closed?: boolean;
}

export interface EllipseEntity extends BaseEntity {
  type: 'ellipse';
  center: Point2D;
  radiusX: number; // semi-major axis
  radiusY: number; // semi-minor axis
  rotation: number; // radians
  startAngle: number; // radians
  endAngle: number;   // radians
}

export type HatchPattern = 'SOLID' | 'ANSI31' | 'ANSI32' | 'GRID' | 'DOTS';

export interface HatchEntity extends BaseEntity {
  type: 'hatch';
  boundary: Point2D[];
  pattern: HatchPattern;
  scale: number;
  angle: number; // in radians
  fillColor?: string;
  opacity?: number;
}

export interface CADBlockAttributeDefinition {
  tag: string;
  prompt: string;
  defaultValue: string;
  position: Point2D; // relative to block basePoint
  fontSize?: number;
}

export interface CADBlockDefinition {
  id: string;
  name: string;
  basePoint: Point2D;
  entities: CADEntity[];
  attributes: CADBlockAttributeDefinition[];
  description?: string;
  category?: 'architecture' | 'civil' | 'electrical' | 'mechanical' | 'symbols' | 'custom';
}

export interface BlockReferenceEntity extends BaseEntity {
  type: 'insert';
  blockName: string;
  position: Point2D;
  scale: { x: number; y: number };
  rotation: number; // in radians
  attributeValues: Record<string, string>;
}

// -------------------------------------------------------------
// Dimensioning & Technical Annotations (ABNT / ISO)
// -------------------------------------------------------------
export type DimensionType =
  | 'linear'
  | 'aligned'
  | 'angular'
  | 'radial'
  | 'diameter'
  | 'arc_length'
  | 'ordinate';

export interface CADDimStyle {
  id: string;
  name: string;
  arrowType: 'arrow' | 'tick' | 'dot' | 'open';
  arrowSize: number; // e.g. 2.5
  textHeight: number; // e.g. 2.5
  textOffset: number; // gap between text and dim line (e.g. 1.0)
  extensionLineExtension: number; // overshoot past dim line (dimexe, e.g. 1.25)
  extensionLineOffset: number; // offset from measured origin (dimexo, e.g. 0.625)
  suppressExtLine1?: boolean;
  suppressExtLine2?: boolean;
  suppressDimLine1?: boolean;
  suppressDimLine2?: boolean;
  unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  precision: number; // 0, 1, 2, 3, 4 decimal places
  scaleFactor: number; // linear multiplier, default 1.0
  prefix?: string;
  suffix?: string;
  decimalSeparator?: '.' | ',';
  toleranceEnabled?: boolean;
  toleranceUpper?: number;
  toleranceLower?: number;
}

export interface DimensionEntity extends BaseEntity {
  type: 'dimension';
  dimType: DimensionType;
  dimStyleId?: string;

  // Linear & Aligned
  defPoint1: Point2D; // 1st extension line origin
  defPoint2: Point2D; // 2nd extension line origin
  dimLinePoint: Point2D; // location of the dimension line / text
  linearOrientation?: 'horizontal' | 'vertical' | 'aligned';

  // Radial / Diameter
  centerPoint?: Point2D;
  chordPoint?: Point2D; // Point on circle/arc circumference

  // Angular
  vertexPoint?: Point2D;
  line1Start?: Point2D;
  line1End?: Point2D;
  line2Start?: Point2D;
  line2End?: Point2D;
  arcPoint?: Point2D;

  // Ordinate
  featureLocation?: Point2D;
  leaderEndPoint?: Point2D;
  ordinateAxis?: 'X' | 'Y';
  datumOrigin?: Point2D;

  // Arc Length
  arcCenter?: Point2D;
  arcRadius?: number;
  startAngle?: number;
  endAngle?: number;

  // Values & Customizations
  measurement: number;
  textOverride?: string;
  textPosition?: Point2D;
}

export interface MultileaderEntity extends BaseEntity {
  type: 'multileader';
  arrowPoint: Point2D; // Target point (arrowhead)
  landingPoint: Point2D; // Shoulder / elbow point
  doglegLength: number; // Horizontal landing line length (e.g. 10)
  landingDirection: 1 | -1; // 1 = right, -1 = left
  text: string; // Explanatory text annotation
  contentStyle: 'text' | 'balloon'; // Plain note or circled bubble
  balloonNumber?: string;
  arrowType?: 'arrow' | 'dot' | 'tick';
  textHeight?: number;
}

export interface CADGrip {
  id: string;
  entityId: string;
  position: Point2D;
  type: 'endpoint' | 'midpoint' | 'center' | 'quadrant' | 'vertex' | 'insert';
  index?: number;
}

export interface ImageEntity extends BaseEntity {
  type: 'image';
  url: string;
  position: Point2D;
  width: number;
  height: number;
  rotation?: number; // radians
  opacity?: number;  // 0 to 1
  name?: string;
}

export type CADEntity =
  | LineEntity
  | CircleEntity
  | RectangleEntity
  | PolylineEntity
  | ArcEntity
  | TextEntity
  | SplineEntity
  | EllipseEntity
  | HatchEntity
  | ImageEntity
  | BlockReferenceEntity
  | DimensionEntity
  | MultileaderEntity
  | (BaseEntity & Record<string, any>);

// -------------------------------------------------------------
// Viewport & Coordinate System
// -------------------------------------------------------------
export interface ViewportState {
  cameraX: number;
  cameraY: number;
  zoom: number; // pixels per world unit
  width: number;
  height: number;
}

export interface CADPointerEvent {
  screen: Point2D;
  world: Point2D;
  raw: MouseEvent;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  snapped?: SnapResult | null;
}

// -------------------------------------------------------------
// Snapping (OSNAP)
// -------------------------------------------------------------
export type SnapType =
  | 'endpoint'
  | 'midpoint'
  | 'center'
  | 'intersection'
  | 'perpendicular'
  | 'nearest'
  | 'grid';

export interface SnapResult {
  point: Point2D;
  type: SnapType;
  entityId?: string;
  description: string;
}

export interface SnapSettings {
  enabled: boolean;
  gridSnap: boolean;
  gridSize: number;
  endpoint: boolean;
  midpoint: boolean;
  center: boolean;
  intersection: boolean;
  perpendicular: boolean;
  nearest: boolean;
  snapToleranceScreen: number; // in screen pixels
}

// -------------------------------------------------------------
// Strategy / Tool Interface
// -------------------------------------------------------------
export interface CADTool {
  id: string;
  name: string;
  category: 'select' | 'draw' | 'modify' | 'annotation' | 'utility';
  cursor?: string;
  shortcut?: string;
  icon?: string;
  onActivate(core: CADCoreAPI): void;
  onDeactivate(core: CADCoreAPI): void;
  onPointerDown(e: CADPointerEvent): void;
  onPointerMove(e: CADPointerEvent): void;
  onPointerUp(e: CADPointerEvent): void;
  onKeyDown?(e: KeyboardEvent): void;
  cancel?(): void;
}

// -------------------------------------------------------------
// Core API provided to Plugins & Tools
// -------------------------------------------------------------
export interface CADCoreAPI {
  // Plugin Management
  registerPlugin(plugin: CADPlugin): void;
  unregisterPlugin(pluginId: string): void;
  getPlugins(): CADPlugin[];

  // Tool Management (Strategy / Registry)
  registerTool(tool: CADTool): void;
  unregisterTool(toolId: string): void;
  getTools(): CADTool[];
  getActiveTool(): CADTool | null;
  setActiveTool(toolId: string | null): void;

  // Command History (Undo / Redo)
  executeCommand(command: CADCommand): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  getHistory(): { undoStack: string[]; redoStack: string[] };

  // Entity Management
  addEntity(entity: CADEntity, select?: boolean): void;
  removeEntity(id: string): void;
  updateEntity(entity: CADEntity): void;
  getEntity(id: string): CADEntity | undefined;
  getEntities(): CADEntity[];
  getSelectedEntities(): CADEntity[];
  selectEntities(ids: string[], append?: boolean): void;
  deselectEntities(ids: string[]): void;
  clearSelection(): void;

  // Layers
  getLayers(): CADLayer[];
  getActiveLayer(): CADLayer;
  setActiveLayer(layerId: string): void;
  addLayer(layer: CADLayer): void;
  updateLayer(layer: CADLayer): void;
  removeLayer(layerId: string): void;

  // Coordinate Conversion (World <-> Screen)
  screenToWorld(screenX: number, screenY: number): Point2D;
  worldToScreen(worldX: number, worldY: number): Point2D;

  // Viewport Control
  getViewport(): ViewportState;
  setViewport(state: Partial<ViewportState>): void;
  panBy(dx: number, dy: number): void;
  zoomAt(screenX: number, screenY: number, factor: number): void;
  zoomExtents(): void;

  // Snapping
  snapPoint(rawWorldPoint: Point2D, rawScreenPoint: Point2D): SnapResult | null;
  getSnapSettings(): SnapSettings;
  setSnapSettings(settings: Partial<SnapSettings>): void;

  // Ortho & Polar tracking
  isOrthoMode(): boolean;
  setOrthoMode(enabled: boolean): void;
  isPolarTracking(): boolean;
  setPolarTracking(enabled: boolean): void;
  getPolarIncrement(): number;
  setPolarIncrement(deg: number): void;
  isOTrack(): boolean;
  setOTrack(enabled: boolean): void;

  // Block Management
  registerBlockDefinition(def: CADBlockDefinition): void;
  getBlockDefinition(name: string): CADBlockDefinition | undefined;
  getBlockDefinitions(): CADBlockDefinition[];
  hasBlockDefinition(name: string): boolean;

  // Dimension Styles
  getDimStyles(): CADDimStyle[];
  getActiveDimStyle(): CADDimStyle;
  setActiveDimStyle(id: string): void;
  addDimStyle(style: CADDimStyle): void;
  updateDimStyle(id: string, changes: Partial<CADDimStyle>): void;
  deleteDimStyle(id: string): boolean;

  // Grip Management
  getActiveGrip(): CADGrip | null;
  setActiveGrip(grip: CADGrip | null): void;
  getEntityGrips(entity: CADEntity): CADGrip[];

  // Render & Preview
  requestRender(): void;
  setPreviewEntity(entity: CADEntity | null): void;
  getPreviewEntity(): CADEntity | null;
  setSelectionBox(box: { start: Point2D; current: Point2D; isCrossing: boolean } | null): void;
  getSelectionBox(): { start: Point2D; current: Point2D; isCrossing: boolean } | null;

  // UI & Console Feedback
  setPrompt(prompt: string): void;
  getPrompt(): string;
  logCommandMessage(msg: string): void;
  on(event: CADCoreEvent, handler: (...args: any[]) => void): () => void;
  emit(event: CADCoreEvent, ...args: any[]): void;

  // Layouts, Paper Space & Plotting (Phase 5)
  getActiveSpace(): 'model' | string;
  isModelSpace(): boolean;
  setActiveSpace(space: 'model' | string): void;
  getLayouts(): import('./layout/LayoutTypes').CADLayout[];
  getActiveLayout(): import('./layout/LayoutTypes').CADLayout | undefined;
  getLayout(id: string): import('./layout/LayoutTypes').CADLayout | undefined;
  createLayout(options?: Partial<import('./layout/LayoutTypes').CADLayout>): import('./layout/LayoutTypes').CADLayout;
  updateLayout(id: string, updates: Partial<import('./layout/LayoutTypes').CADLayout>): import('./layout/LayoutTypes').CADLayout | undefined;
  deleteLayout(id: string): boolean;
  addLayoutViewport(layoutId: string, vp: Omit<import('./layout/LayoutTypes').LayoutViewport, 'id'>): import('./layout/LayoutTypes').LayoutViewport | null;
  updateLayoutViewport(layoutId: string, vpId: string, updates: Partial<import('./layout/LayoutTypes').LayoutViewport>): boolean;
  removeLayoutViewport(layoutId: string, vpId: string): boolean;
  setVPFreeze(layoutId: string, vpId: string, layerId: string, frozen: boolean): boolean;
  getPlotStyleTables(): import('./layout/LayoutTypes').PlotStyleTable[];
  downloadPlotPDF(config: import('./layout/LayoutTypes').PlotConfig): void;
  openPlotModal(): void;

  // Interoperability & DXF/DWG/Raster (Phase 6)
  importDXF(dxfContent: string, options?: { clearExisting?: boolean; scale?: number }): { entitiesCount: number; layersCount: number };
  exportDXF(options?: { version?: 'R12' | 'R2000' | 'R2018' }): string;
  downloadDXF(fileName?: string, options?: { version?: 'R12' | 'R2000' | 'R2018' }): void;
  attachRasterImage(image: Omit<ImageEntity, 'id' | 'type' | 'layerId'> & { layerId?: string }): ImageEntity;
  calibrateImageScale(imageId: string, p1: Point2D, p2: Point2D, realDistance: number): boolean;
  openDXFImportModal(): void;
  openRasterImageModal(): void;
}

export type CADCoreEvent =
  | 'entity:added'
  | 'entity:removed'
  | 'entity:updated'
  | 'selection:changed'
  | 'tool:changed'
  | 'viewport:changed'
  | 'history:changed'
  | 'layer:changed'
  | 'prompt:changed'
  | 'message:logged'
  | 'snap:changed'
  | 'tracking:changed'
  | 'block:registered'
  | 'block:open_create_modal'
  | 'block:open_attributes_modal'
  | 'dimstyle:changed'
  | 'dimstyle:open_modal'
  | 'data_extraction:open_modal'
  | 'grip:changed'
  | 'cursor:moved'
  | 'layout:changed'
  | 'space:changed'
  | 'plot:open_modal'
  | 'dxf:open_import_modal'
  | 'image:open_attach_modal'
  | 'dxf:imported'
  | 'dxf:exported'
  | 'render:requested';
