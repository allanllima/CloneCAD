import {
  CADCommand,
  CADCoreAPI,
  CADCoreEvent,
  CADEntity,
  CADLayer,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
  SnapResult,
  SnapSettings,
  ViewportState,
  CADBlockDefinition,
  CADGrip,
  CADDimStyle,
} from './types';
import { Viewport } from './Viewport';
import { HistoryManager } from './HistoryManager';
import { LayerManager } from './LayerManager';
import { SelectionManager } from './SelectionManager';
import { SnapEngine } from './SnapEngine';
import { EventBus } from './EventBus';
import { CADRenderer } from './Renderer';
import { TrackingEngine, TrackingRay } from './TrackingEngine';
import { BlockManager } from './BlockManager';
import { GripManager } from './GripManager';
import { DimStyleManager } from './DimStyleManager';
import { LayoutManager } from './layout/LayoutManager';
import { PlotStyleManager } from './layout/PlotStyleManager';
import { PDFPlotter } from './layout/PDFPlotter';
import {
  CADLayout,
  LayoutViewport,
  PlotStyleTable,
  PlotConfig,
} from './layout/LayoutTypes';
import { ModifyEntityCommand } from '../commands/ModifyEntityCommand';

export class CADCore implements CADCoreAPI {
  // Subsystems
  private viewport: Viewport;
  private history: HistoryManager;
  private layers: LayerManager;
  private selection: SelectionManager;
  private snapEngine: SnapEngine;
  private trackingEngine: TrackingEngine;
  private blockManager: BlockManager;
  private gripManager: GripManager;
  private dimStyleManager: DimStyleManager;
  private layoutManager: LayoutManager;
  private plotStyleManager: PlotStyleManager;
  private pdfPlotter: PDFPlotter;
  private eventBus: EventBus;
  private renderer: CADRenderer | null = null;

  // Storage
  private entities: Map<string, CADEntity> = new Map();
  private plugins: Map<string, CADPlugin> = new Map();
  private tools: Map<string, CADTool> = new Map();
  private activeTool: CADTool | null = null;

  // Transient state
  private previewEntity: CADEntity | null = null;
  private selectionBox: { start: Point2D; current: Point2D; isCrossing: boolean } | null = null;
  private orthoMode: boolean = false;
  private currentPrompt: string = 'Command:';

  // Middle-mouse panning state
  private isMiddlePanning = false;
  private lastMiddlePanScreen: Point2D = { x: 0, y: 0 };

  constructor(width = 800, height = 600) {
    this.eventBus = new EventBus();
    this.viewport = new Viewport(width, height);
    this.snapEngine = new SnapEngine();
    this.trackingEngine = new TrackingEngine();
    this.blockManager = new BlockManager(() => this.eventBus.emit('block:registered'));
    this.gripManager = new GripManager();
    this.dimStyleManager = new DimStyleManager();
    this.plotStyleManager = new PlotStyleManager();
    this.layoutManager = new LayoutManager(() => {
      this.eventBus.emit('layout:changed');
      this.requestRender();
    });
    this.pdfPlotter = new PDFPlotter(this.layoutManager, this.plotStyleManager);

    this.layers = new LayerManager(() => {
      this.eventBus.emit('layer:changed');
      this.requestRender();
    });

    this.history = new HistoryManager(() => {
      this.eventBus.emit('history:changed');
      this.requestRender();
    });

    this.selection = new SelectionManager(() => {
      // Sync selected status on entity objects
      const selectedIds = new Set(this.selection.getSelectedIds());
      for (const ent of this.entities.values()) {
        ent.selected = selectedIds.has(ent.id);
      }
      this.eventBus.emit('selection:changed', this.getSelectedEntities());
      this.requestRender();
    });
  }

  // ---------------------------------------------------------------------------
  // Renderer Binding
  // ---------------------------------------------------------------------------
  public attachRenderer(container: HTMLElement): void {
    if (this.renderer) {
      this.renderer.destroy();
    }
    this.renderer = new CADRenderer(container, this.viewport);
    this.renderer.setBlockResolver((name) => this.blockManager.getBlock(name));
    this.renderer.setDimStyleResolver((id) =>
      id ? (this.dimStyleManager.getStyle(id) || this.dimStyleManager.getActiveStyle()) : this.dimStyleManager.getActiveStyle()
    );
    this.requestRender();
  }

  public detachRenderer(): void {
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }

  public resize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.resize(width, height);
    } else {
      this.viewport.setDimensions(width, height);
    }
    this.eventBus.emit('viewport:changed', this.viewport.getState());
  }

  // ---------------------------------------------------------------------------
  // Plugin Management (Plugin / Microkernel Pattern)
  // ---------------------------------------------------------------------------
  public registerPlugin(plugin: CADPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered. Overwriting.`);
      this.unregisterPlugin(plugin.id);
    }
    this.plugins.set(plugin.id, plugin);
    try {
      plugin.init(this);
      this.logCommandMessage(`Loaded plugin: ${plugin.name} v${plugin.version}`);
    } catch (err) {
      console.error(`Failed to initialize plugin ${plugin.id}:`, err);
    }
  }

  public unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      try {
        plugin.destroy?.();
      } catch (err) {
        console.error(`Error destroying plugin ${pluginId}:`, err);
      }
      this.plugins.delete(pluginId);
    }
  }

  public getPlugins(): CADPlugin[] {
    return Array.from(this.plugins.values());
  }

  // ---------------------------------------------------------------------------
  // Tool Management (Strategy / State Pattern)
  // ---------------------------------------------------------------------------
  public registerTool(tool: CADTool): void {
    this.tools.set(tool.id, tool);
  }

  public unregisterTool(toolId: string): void {
    if (this.activeTool?.id === toolId) {
      this.setActiveTool(null);
    }
    this.tools.delete(toolId);
  }

  public getTools(): CADTool[] {
    return Array.from(this.tools.values());
  }

  public getActiveTool(): CADTool | null {
    return this.activeTool;
  }

  public setActiveTool(toolId: string | null): void {
    if (this.activeTool) {
      this.activeTool.onDeactivate(this);
      this.setPreviewEntity(null);
      this.setSelectionBox(null);
    }
    this.trackingEngine.clearAcquiredPoints();
    if (this.renderer) {
      this.renderer.renderTrackingRays(null);
    }

    if (!toolId) {
      // Default to Select tool if registered, or null
      this.activeTool = this.tools.get('select') || null;
    } else {
      const tool = this.tools.get(toolId);
      if (tool) {
        this.activeTool = tool;
      } else {
        console.warn(`Tool "${toolId}" not found. Falling back to select.`);
        this.activeTool = this.tools.get('select') || null;
      }
    }

    if (this.activeTool) {
      this.activeTool.onActivate(this);
      this.setPrompt(`Command: ${this.activeTool.name.toUpperCase()}`);
    } else {
      this.setPrompt('Command:');
    }

    this.eventBus.emit('tool:changed', this.activeTool);
    this.requestRender();
  }

  // ---------------------------------------------------------------------------
  // Command History (Command Pattern)
  // ---------------------------------------------------------------------------
  public executeCommand(command: CADCommand): void {
    this.history.execute(command);
  }

  public undo(): boolean {
    const success = this.history.undo();
    if (success) {
      this.logCommandMessage('UNDO');
      this.clearSelection();
    }
    return success;
  }

  public redo(): boolean {
    const success = this.history.redo();
    if (success) {
      this.logCommandMessage('REDO');
      this.clearSelection();
    }
    return success;
  }

  public canUndo(): boolean {
    return this.history.canUndo();
  }

  public canRedo(): boolean {
    return this.history.canRedo();
  }

  public getHistory(): { undoStack: string[]; redoStack: string[] } {
    return this.history.getHistory();
  }

  // ---------------------------------------------------------------------------
  // Entity Management
  // ---------------------------------------------------------------------------
  public addEntity(entity: CADEntity, select = false): void {
    // Ensure layer defaults if missing
    if (!entity.layerId) {
      entity.layerId = this.getActiveLayer().id;
    }
    this.entities.set(entity.id, entity);
    this.selection.indexEntity(entity);

    if (select) {
      this.selectEntities([entity.id], false);
    }
    this.eventBus.emit('entity:added', entity);
    this.requestRender();
  }

  public removeEntity(id: string): void {
    const entity = this.entities.get(id);
    if (entity) {
      this.entities.delete(id);
      this.selection.unindexEntity(id);
      this.selection.deselect([id]);
      this.eventBus.emit('entity:removed', id);
      this.requestRender();
    }
  }

  public updateEntity(entity: CADEntity): void {
    if (this.entities.has(entity.id)) {
      this.entities.set(entity.id, { ...entity });
      this.selection.indexEntity(entity);
      this.eventBus.emit('entity:updated', entity);
      this.requestRender();
    }
  }

  public getEntity(id: string): CADEntity | undefined {
    return this.entities.get(id);
  }

  public getEntities(): CADEntity[] {
    return Array.from(this.entities.values());
  }

  public getSelectedEntities(): CADEntity[] {
    const ids = this.selection.getSelectedIds();
    return ids.map((id) => this.entities.get(id)).filter((e): e is CADEntity => !!e);
  }

  public selectEntities(ids: string[], append = false): void {
    this.selection.select(ids, append);
  }

  public deselectEntities(ids: string[]): void {
    this.selection.deselect(ids);
  }

  public clearSelection(): void {
    this.selection.clear();
  }

  // ---------------------------------------------------------------------------
  // Layers
  // ---------------------------------------------------------------------------
  public getLayers(): CADLayer[] {
    return this.layers.getLayers();
  }

  public getActiveLayer(): CADLayer {
    return this.layers.getActiveLayer();
  }

  public setActiveLayer(layerId: string): void {
    this.layers.setActiveLayer(layerId);
  }

  public addLayer(layer: CADLayer): void {
    this.layers.addLayer(layer);
  }

  public updateLayer(layer: CADLayer): void {
    this.layers.updateLayer(layer);
  }

  public removeLayer(layerId: string): void {
    this.layers.removeLayer(layerId);
  }

  // ---------------------------------------------------------------------------
  // Coordinate Conversion (World <-> Screen)
  // ---------------------------------------------------------------------------
  public screenToWorld(screenX: number, screenY: number): Point2D {
    return this.viewport.screenToWorld(screenX, screenY);
  }

  public worldToScreen(worldX: number, worldY: number): Point2D {
    return this.viewport.worldToScreen(worldX, worldY);
  }

  // ---------------------------------------------------------------------------
  // Viewport Control
  // ---------------------------------------------------------------------------
  public getViewport(): ViewportState {
    return this.viewport.getState();
  }

  public setViewport(state: Partial<ViewportState>): void {
    this.viewport.setState(state);
    if (this.renderer) {
      this.renderer.updateCamera();
    }
    this.eventBus.emit('viewport:changed', this.viewport.getState());
  }

  public panBy(dx: number, dy: number): void {
    this.viewport.panByScreenDelta(dx, dy);
    if (this.renderer) {
      this.renderer.updateCamera();
    }
    this.eventBus.emit('viewport:changed', this.viewport.getState());
  }

  public zoomAt(screenX: number, screenY: number, factor: number): void {
    this.viewport.zoomAt(screenX, screenY, factor);
    if (this.renderer) {
      this.renderer.updateCamera();
    }
    this.eventBus.emit('viewport:changed', this.viewport.getState());
  }

  public zoomExtents(): void {
    const ents = this.getEntities();
    if (ents.length === 0) {
      this.setViewport({ cameraX: 0, cameraY: 0, zoom: 1.0 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ent of ents) {
      const b = this.selection.getEntityBounds(ent);
      if (b) {
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
    }

    if (minX !== Infinity) {
      this.viewport.zoomToBounds({ minX, minY, maxX, maxY }, 80);
      if (this.renderer) {
        this.renderer.updateCamera();
      }
      this.eventBus.emit('viewport:changed', this.viewport.getState());
    }
  }

  // ---------------------------------------------------------------------------
  // Snapping & Ortho
  // ---------------------------------------------------------------------------
  public snapPoint(rawWorldPoint: Point2D, rawScreenPoint: Point2D): SnapResult | null {
    const tolScreen = this.snapEngine.getSettings().snapToleranceScreen;
    const tolWorld = tolScreen / this.viewport.getState().zoom;

    const candidateIds = this.selection.getSpatialIndex().searchPoint(rawWorldPoint, tolWorld * 1.5);
    const candidateEntities = candidateIds.length > 0
      ? candidateIds.map((id) => this.entities.get(id)).filter((e): e is CADEntity => !!e)
      : this.getEntities();

    return this.snapEngine.findSnap(
      candidateEntities,
      rawWorldPoint,
      (w) => this.worldToScreen(w.x, w.y),
      rawScreenPoint
    );
  }

  public getSnapSettings(): SnapSettings {
    return this.snapEngine.getSettings();
  }

  public setSnapSettings(settings: Partial<SnapSettings>): void {
    this.snapEngine.setSettings(settings);
    this.eventBus.emit('snap:changed', this.snapEngine.getSettings());
  }

  public isOrthoMode(): boolean {
    return this.orthoMode;
  }

  public setOrthoMode(enabled: boolean): void {
    this.orthoMode = enabled;
    if (enabled && this.trackingEngine.isPolarEnabled()) {
      this.trackingEngine.setPolarEnabled(false);
      this.eventBus.emit('tracking:changed');
    }
    this.logCommandMessage(`<Ortho ${enabled ? 'ON' : 'OFF'}>`);
  }

  public isPolarTracking(): boolean {
    return this.trackingEngine.isPolarEnabled();
  }

  public setPolarTracking(enabled: boolean): void {
    this.trackingEngine.setPolarEnabled(enabled);
    if (enabled && this.orthoMode) {
      this.orthoMode = false;
    }
    this.logCommandMessage(`<Polar ${enabled ? 'ON' : 'OFF'}>`);
    this.eventBus.emit('tracking:changed');
  }

  public getPolarIncrement(): number {
    return this.trackingEngine.getPolarIncrement();
  }

  public setPolarIncrement(deg: number): void {
    this.trackingEngine.setPolarIncrement(deg);
    this.eventBus.emit('tracking:changed');
  }

  public isOTrack(): boolean {
    return this.trackingEngine.isOTrackEnabled();
  }

  public setOTrack(enabled: boolean): void {
    this.trackingEngine.setOTrackEnabled(enabled);
    this.logCommandMessage(`<Object Snap Tracking ${enabled ? 'ON' : 'OFF'}>`);
    this.eventBus.emit('tracking:changed');
  }

  // ---------------------------------------------------------------------------
  // Block Subsystem
  // ---------------------------------------------------------------------------
  public registerBlockDefinition(def: CADBlockDefinition): void {
    this.blockManager.registerBlock(def);
    this.logCommandMessage(`Block "${def.name}" defined.`);
    this.eventBus.emit('block:registered');
  }

  public getBlockDefinition(name: string): CADBlockDefinition | undefined {
    return this.blockManager.getBlock(name);
  }

  public getBlockDefinitions(): CADBlockDefinition[] {
    return this.blockManager.getAllBlocks();
  }

  public hasBlockDefinition(name: string): boolean {
    return this.blockManager.hasBlock(name);
  }

  public getBlockManager(): BlockManager {
    return this.blockManager;
  }

  // ---------------------------------------------------------------------------
  // Dimension Styles Subsystem
  // ---------------------------------------------------------------------------
  public getDimStyles(): CADDimStyle[] {
    return this.dimStyleManager.getStyles();
  }

  public getActiveDimStyle(): CADDimStyle {
    return this.dimStyleManager.getActiveStyle();
  }

  public setActiveDimStyle(id: string): void {
    this.dimStyleManager.setActiveStyle(id);
    this.eventBus.emit('dimstyle:changed', this.dimStyleManager.getActiveStyle());
    this.requestRender();
  }

  public addDimStyle(style: CADDimStyle): void {
    this.dimStyleManager.addStyle(style);
    this.eventBus.emit('dimstyle:changed', this.dimStyleManager.getActiveStyle());
    this.logCommandMessage(`Dimension Style "${style.name}" created.`);
  }

  public updateDimStyle(id: string, changes: Partial<CADDimStyle>): void {
    this.dimStyleManager.updateStyle(id, changes);
    this.eventBus.emit('dimstyle:changed', this.dimStyleManager.getActiveStyle());
    this.requestRender();
  }

  public deleteDimStyle(id: string): boolean {
    const ok = this.dimStyleManager.deleteStyle(id);
    if (ok) {
      this.eventBus.emit('dimstyle:changed', this.dimStyleManager.getActiveStyle());
      this.requestRender();
    }
    return ok;
  }

  public getDimStyleManager(): DimStyleManager {
    return this.dimStyleManager;
  }

  // ---------------------------------------------------------------------------
  // Grip Subsystem
  // ---------------------------------------------------------------------------
  public getActiveGrip(): CADGrip | null {
    return this.gripManager.getActiveGrip();
  }

  public setActiveGrip(grip: CADGrip | null): void {
    this.gripManager.setActiveGrip(grip);
    this.eventBus.emit('grip:changed');
    this.requestRender();
  }

  public getEntityGrips(entity: CADEntity): CADGrip[] {
    return this.gripManager.getEntityGrips(entity);
  }

  public getGripManager(): GripManager {
    return this.gripManager;
  }

  // ---------------------------------------------------------------------------
  // Render & Previews
  // ---------------------------------------------------------------------------
  public requestRender(): void {
    if (this.renderer) {
      if (this.isModelSpace()) {
        this.renderer.renderPaperLayout(undefined, [], [], this.layoutManager);
        this.renderer.renderEntities(this.getEntities(), this.getLayers());
      } else {
        this.renderer.renderPaperLayout(
          this.getActiveLayout(),
          this.getEntities(),
          this.getLayers(),
          this.layoutManager
        );
      }
      this.renderer.renderPreview(this.previewEntity);
      this.renderer.renderSelectionBox(this.selectionBox);

      // Render interactive grips for selected entities
      const selected = this.getSelectedEntities();
      if (selected.length > 0 && (!this.activeTool || this.activeTool.id === 'select')) {
        const grips = this.gripManager.generateGrips(selected);
        this.renderer.renderGrips(grips, this.gripManager.getActiveGrip()?.id);
      } else {
        this.renderer.renderGrips(null);
      }

      this.renderer.requestRender();
    }
    this.eventBus.emit('render:requested');
  }

  public setPreviewEntity(entity: CADEntity | null): void {
    this.previewEntity = entity;
    if (this.renderer) {
      this.renderer.renderPreview(entity);
    }
  }

  public getPreviewEntity(): CADEntity | null {
    return this.previewEntity;
  }

  public setSelectionBox(box: { start: Point2D; current: Point2D; isCrossing: boolean } | null): void {
    this.selectionBox = box;
    if (this.renderer) {
      this.renderer.renderSelectionBox(box);
    }
  }

  public getSelectionBox(): { start: Point2D; current: Point2D; isCrossing: boolean } | null {
    return this.selectionBox;
  }

  // ---------------------------------------------------------------------------
  // UI & Console Feedback
  // ---------------------------------------------------------------------------
  public setPrompt(prompt: string): void {
    this.currentPrompt = prompt;
    this.eventBus.emit('prompt:changed', prompt);
  }

  public getPrompt(): string {
    return this.currentPrompt;
  }

  public logCommandMessage(msg: string): void {
    this.eventBus.emit('message:logged', msg);
  }

  public on(event: CADCoreEvent, handler: (...args: any[]) => void): () => void {
    return this.eventBus.on(event, handler);
  }

  public emit(event: CADCoreEvent, ...args: any[]): void {
    this.eventBus.emit(event, ...args);
  }

  // ---------------------------------------------------------------------------
  // Pointer Event Pipeline
  // ---------------------------------------------------------------------------
  public handlePointerDown(e: MouseEvent, screenX: number, screenY: number): void {
    // Middle-click pan handling (classic CAD pan)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isMiddlePanning = true;
      this.lastMiddlePanScreen = { x: screenX, y: screenY };
      return;
    }

    const event = this.createCADPointerEvent(e, screenX, screenY);

    // Grip Editing Workflow
    if (e.button === 0 && (!this.activeTool || this.activeTool.id === 'select')) {
      // 1. If currently stretching an active grip, commit the modification!
      if (this.gripManager.getActiveGrip()) {
        const activeGrip = this.gripManager.getActiveGrip()!;
        const orig = this.gripManager.getOriginalEntityState();
        if (orig) {
          const updated = this.gripManager.updateEntityWithGrip(orig, activeGrip, event.world);
          this.setPreviewEntity(null);
          this.gripManager.setActiveGrip(null);
          this.executeCommand(new ModifyEntityCommand(this, orig, updated, 'GRIP STRETCH'));
          this.setPrompt('Command:');
          this.requestRender();
          return;
        }
      }

      // 2. If entities are selected, check if user clicked on a grip
      const selected = this.getSelectedEntities();
      if (selected.length > 0) {
        const tol = 10 / this.viewport.getState().zoom;
        const grips = this.gripManager.generateGrips(selected);
        const hitGrip = this.gripManager.pickGrip(grips, event.world, tol);
        if (hitGrip) {
          const ent = this.getEntity(hitGrip.entityId);
          if (ent) {
            this.gripManager.setActiveGrip(hitGrip, ent);
            this.setPrompt(`** STRETCH ** Specify stretch point:`);
            this.eventBus.emit('grip:changed');
            this.requestRender();
            return;
          }
        }
      }
    }

    if (this.activeTool) {
      this.activeTool.onPointerDown(event);
    }
  }

  public handlePointerMove(e: MouseEvent, screenX: number, screenY: number): void {
    if (this.isMiddlePanning) {
      const dx = screenX - this.lastMiddlePanScreen.x;
      const dy = screenY - this.lastMiddlePanScreen.y;
      this.lastMiddlePanScreen = { x: screenX, y: screenY };
      this.panBy(dx, dy);
      return;
    }

    const event = this.createCADPointerEvent(e, screenX, screenY);
    this.emit('cursor:moved', event.world);

    // Grip stretch real-time preview
    if (this.gripManager.getActiveGrip()) {
      const activeGrip = this.gripManager.getActiveGrip()!;
      const orig = this.gripManager.getOriginalEntityState();
      if (orig) {
        const updated = this.gripManager.updateEntityWithGrip(orig, activeGrip, event.world);
        this.setPreviewEntity(updated);
        this.requestRender();
        return;
      }
    }

    if (this.activeTool) {
      this.activeTool.onPointerMove(event);
    }
  }

  public handlePointerUp(e: MouseEvent, screenX: number, screenY: number): void {
    if (this.isMiddlePanning && (e.button === 1 || e.button === 0)) {
      this.isMiddlePanning = false;
      return;
    }

    const event = this.createCADPointerEvent(e, screenX, screenY);
    if (this.activeTool) {
      this.activeTool.onPointerUp(event);
    }
  }

  public handleWheel(e: WheelEvent, screenX: number, screenY: number): void {
    // Zoom factor: 1.1x per tick in, 0.9x tick out
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.zoomAt(screenX, screenY, zoomFactor);
  }

  public handleKeyDown(e: KeyboardEvent): void {
    // F8: Ortho Mode toggle
    if (e.key === 'F8') {
      e.preventDefault();
      this.setOrthoMode(!this.orthoMode);
      return;
    }
    // F3: OSNAP toggle
    if (e.key === 'F3') {
      e.preventDefault();
      const s = this.getSnapSettings();
      this.setSnapSettings({ enabled: !s.enabled });
      this.logCommandMessage(`<Osnap ${!s.enabled ? 'ON' : 'OFF'}>`);
      return;
    }
    // F10: Polar Tracking toggle
    if (e.key === 'F10') {
      e.preventDefault();
      this.setPolarTracking(!this.isPolarTracking());
      return;
    }
    // F11: O-Track toggle
    if (e.key === 'F11') {
      e.preventDefault();
      this.setOTrack(!this.isOTrack());
      return;
    }
    // Escape: Cancel active grip, active tool, or clear selection
    if (e.key === 'Escape') {
      if (this.gripManager.getActiveGrip()) {
        this.gripManager.setActiveGrip(null);
        this.setPreviewEntity(null);
        this.setPrompt('Command:');
        this.requestRender();
        return;
      }

      if (this.activeTool && this.activeTool.cancel) {
        this.activeTool.cancel();
      }
      this.clearSelection();
      this.setActiveTool('select');
      this.setPrompt('Command:');
      this.logCommandMessage('*Cancel*');
      if (this.renderer) {
        this.renderer.renderTrackingRays(null);
      }
      return;
    }

    if (this.activeTool?.onKeyDown) {
      this.activeTool.onKeyDown(e);
    }
  }

  private createCADPointerEvent(e: MouseEvent, screenX: number, screenY: number): CADPointerEvent {
    let world = this.screenToWorld(screenX, screenY);
    const snap = this.snapPoint(world, { x: screenX, y: screenY });

    if (snap) {
      world = { ...snap.point };
      this.trackingEngine.acquirePoint(snap.point);
      if (this.renderer) {
        this.renderer.renderTrackingRays(null);
      }
    } else {
      let basePoint: Point2D | null = null;
      if (this.activeTool) {
        if (typeof (this.activeTool as any).getBasePoint === 'function') {
          basePoint = (this.activeTool as any).getBasePoint();
        } else if ((this.activeTool as any).basePoint) {
          basePoint = (this.activeTool as any).basePoint;
        } else if ((this.activeTool as any).startPoint) {
          basePoint = (this.activeTool as any).startPoint;
        }
      }

      const tracking = this.trackingEngine.evaluateTracking(
        world,
        basePoint,
        this.viewport.getState().zoom
      );

      if (tracking) {
        world = tracking.snappedPoint;
        if (this.renderer) {
          this.renderer.renderTrackingRays(tracking.rays);
        }
      } else {
        if (this.renderer) {
          this.renderer.renderTrackingRays(null);
        }
      }
    }

    return {
      screen: { x: screenX, y: screenY },
      world,
      raw: e,
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      snapped: snap,
    };
  }

  public getSelectionManager(): SelectionManager {
    return this.selection;
  }

  // ---------------------------------------------------------------------------
  // Layouts, Paper Space & Plotting (Phase 5)
  // ---------------------------------------------------------------------------
  public getActiveSpace(): 'model' | string {
    return this.layoutManager.getActiveSpace();
  }

  public isModelSpace(): boolean {
    return this.layoutManager.isModelSpace();
  }

  public setActiveSpace(space: 'model' | string): void {
    const prev = this.layoutManager.getActiveSpace();
    if (prev === space) return;

    this.layoutManager.setActiveSpace(space);

    if (space !== 'model') {
      const layout = this.layoutManager.getLayout(space);
      if (layout) {
        const dims = this.layoutManager.getPaperDimensions(layout);
        // Center view on paper sheet with comfortable margin
        const pad = 120;
        const zoomX = this.viewport.getState().width / (dims.width + pad);
        const zoomY = this.viewport.getState().height / (dims.height + pad);
        this.viewport.setState({
          cameraX: dims.width / 2,
          cameraY: dims.height / 2,
          zoom: Math.min(zoomX, zoomY),
        });
      }
    }

    this.eventBus.emit('space:changed', space);
    this.eventBus.emit('layout:changed');
    this.logCommandMessage(`<Espaço alterado: ${space === 'model' ? 'Model Space' : 'Paper Space (' + space + ')'}>`);
    this.requestRender();
  }

  public getLayouts(): CADLayout[] {
    return this.layoutManager.getAllLayouts();
  }

  public getActiveLayout(): CADLayout | undefined {
    return this.layoutManager.getActiveLayout();
  }

  public getLayout(id: string): CADLayout | undefined {
    return this.layoutManager.getLayout(id);
  }

  public createLayout(options?: Partial<CADLayout>): CADLayout {
    const l = this.layoutManager.createLayout(options);
    this.eventBus.emit('layout:changed');
    this.logCommandMessage(`Layout "${l.name}" criado.`);
    this.requestRender();
    return l;
  }

  public updateLayout(id: string, updates: Partial<CADLayout>): CADLayout | undefined {
    const l = this.layoutManager.updateLayout(id, updates);
    this.eventBus.emit('layout:changed');
    this.requestRender();
    return l;
  }

  public deleteLayout(id: string): boolean {
    const ok = this.layoutManager.deleteLayout(id);
    if (ok) {
      this.eventBus.emit('layout:changed');
      this.requestRender();
    }
    return ok;
  }

  public addLayoutViewport(layoutId: string, vp: Omit<LayoutViewport, 'id'>): LayoutViewport | null {
    const res = this.layoutManager.addViewport(layoutId, vp);
    this.eventBus.emit('layout:changed');
    this.requestRender();
    return res;
  }

  public updateLayoutViewport(layoutId: string, vpId: string, updates: Partial<LayoutViewport>): boolean {
    const ok = this.layoutManager.updateViewport(layoutId, vpId, updates);
    this.eventBus.emit('layout:changed');
    this.requestRender();
    return ok;
  }

  public removeLayoutViewport(layoutId: string, vpId: string): boolean {
    const ok = this.layoutManager.removeViewport(layoutId, vpId);
    this.eventBus.emit('layout:changed');
    this.requestRender();
    return ok;
  }

  public setVPFreeze(layoutId: string, vpId: string, layerId: string, frozen: boolean): boolean {
    const ok = this.layoutManager.setVPFreeze(layoutId, vpId, layerId, frozen);
    this.eventBus.emit('layout:changed');
    this.requestRender();
    return ok;
  }

  public getPlotStyleTables(): PlotStyleTable[] {
    return this.plotStyleManager.getTables();
  }

  public plotToPDF(config: PlotConfig) {
    return this.pdfPlotter.plotToPDF(config, this.getEntities(), this.getLayers(), (name) => this.blockManager.getBlock(name));
  }

  public downloadPlotPDF(config: PlotConfig): void {
    this.pdfPlotter.downloadPDF(config, this.getEntities(), this.getLayers(), (name) => this.blockManager.getBlock(name));
    this.logCommandMessage(`Documento PDF exportado com sucesso: ${config.fileName || 'desenho.pdf'}`);
  }

  public openPlotModal(): void {
    this.eventBus.emit('plot:open_modal');
  }

  public getLayoutManager(): LayoutManager {
    return this.layoutManager;
  }

  public getPlotStyleManager(): PlotStyleManager {
    return this.plotStyleManager;
  }

  public getPDFPlotter(): PDFPlotter {
    return this.pdfPlotter;
  }
}
