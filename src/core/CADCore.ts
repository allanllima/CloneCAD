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
} from './types';
import { Viewport } from './Viewport';
import { HistoryManager } from './HistoryManager';
import { LayerManager } from './LayerManager';
import { SelectionManager } from './SelectionManager';
import { SnapEngine } from './SnapEngine';
import { EventBus } from './EventBus';
import { CADRenderer } from './Renderer';

export class CADCore implements CADCoreAPI {
  // Subsystems
  private viewport: Viewport;
  private history: HistoryManager;
  private layers: LayerManager;
  private selection: SelectionManager;
  private snapEngine: SnapEngine;
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
    this.logCommandMessage(`<Ortho ${enabled ? 'ON' : 'OFF'}>`);
  }

  // ---------------------------------------------------------------------------
  // Render & Previews
  // ---------------------------------------------------------------------------
  public requestRender(): void {
    if (this.renderer) {
      this.renderer.renderEntities(this.getEntities(), this.getLayers());
      this.renderer.renderPreview(this.previewEntity);
      this.renderer.renderSelectionBox(this.selectionBox);
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
    // Escape: Cancel active tool or clear selection
    if (e.key === 'Escape') {
      if (this.activeTool && this.activeTool.cancel) {
        this.activeTool.cancel();
      }
      this.clearSelection();
      this.setActiveTool('select');
      this.setPrompt('Command:');
      this.logCommandMessage('*Cancel*');
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
}
