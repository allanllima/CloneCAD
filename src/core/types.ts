/**
 * Core Types & Contracts for CloneCAD Engine
 */

export interface Point2D {
  x: number;
  y: number;
}

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
  | 'cursor:moved'
  | 'render:requested';
