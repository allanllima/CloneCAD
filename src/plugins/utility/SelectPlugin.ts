import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
} from '../../core/types';
import { DeleteEntityCommand } from '../../commands/DeleteEntityCommand';

export class SelectTool implements CADTool {
  public id = 'select';
  public name = 'Select';
  public category: 'select' = 'select';
  public cursor = 'default';
  public shortcut = 'ESC';

  private core: CADCoreAPI | null = null;
  private isBoxSelecting = false;
  private boxStartWorld: Point2D = { x: 0, y: 0 };
  private boxStartScreen: Point2D = { x: 0, y: 0 };

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    // First, check if clicked directly on an entity
    const selectionMgr = (this.core as any).getSelectionManager();
    const toleranceScreen = 6;
    const toleranceWorld = toleranceScreen / this.core.getViewport().zoom;
    const clickedEntity = selectionMgr.pickEntity(
      this.core.getEntities(),
      e.world,
      toleranceWorld
    );

    if (clickedEntity) {
      if (e.shiftKey) {
        // Shift-click toggles selection
        selectionMgr.toggle(clickedEntity.id);
      } else {
        // Single click selects entity
        this.core.selectEntities([clickedEntity.id], false);
      }
      this.isBoxSelecting = false;
      this.core.setSelectionBox(null);
    } else {
      // Clicked on empty space: start window / crossing selection box
      if (!e.shiftKey) {
        this.core.clearSelection();
      }
      this.isBoxSelecting = true;
      this.boxStartWorld = { ...e.world };
      this.boxStartScreen = { ...e.screen };
      this.core.setSelectionBox({
        start: this.boxStartWorld,
        current: this.boxStartWorld,
        isCrossing: false,
      });
    }
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core || !this.isBoxSelecting) return;

    // Crossing selection (Green) if dragged to the left (screen.x < start.x)
    // Window selection (Blue) if dragged to the right (screen.x >= start.x)
    const isCrossing = e.screen.x < this.boxStartScreen.x;

    this.core.setSelectionBox({
      start: this.boxStartWorld,
      current: e.world,
      isCrossing,
    });
  }

  public onPointerUp(e: CADPointerEvent): void {
    if (!this.core || !this.isBoxSelecting) return;

    const isCrossing = e.screen.x < this.boxStartScreen.x;
    const minX = Math.min(this.boxStartWorld.x, e.world.x);
    const maxX = Math.max(this.boxStartWorld.x, e.world.x);
    const minY = Math.min(this.boxStartWorld.y, e.world.y);
    const maxY = Math.max(this.boxStartWorld.y, e.world.y);

    const selectionMgr = (this.core as any).getSelectionManager();
    const distScreen = Math.hypot(e.screen.x - this.boxStartScreen.x, e.screen.y - this.boxStartScreen.y);

    if (distScreen > 4) {
      selectionMgr.selectByBox(
        this.core.getEntities(),
        { minX, maxX, minY, maxY },
        isCrossing,
        e.shiftKey
      );
    }

    this.isBoxSelecting = false;
    this.core.setSelectionBox(null);
  }

  public onKeyDown(e: KeyboardEvent): void {
    if (!this.core) return;

    // Delete or Backspace key erases selected entities
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selected = this.core.getSelectedEntities();
      if (selected.length > 0) {
        e.preventDefault();
        const cmd = new DeleteEntityCommand(this.core, selected);
        this.core.executeCommand(cmd);
        this.core.logCommandMessage(`ERASE: ${selected.length} object(s) deleted.`);
      }
    }
  }

  public cancel(): void {
    this.isBoxSelecting = false;
    if (this.core) {
      this.core.setSelectionBox(null);
    }
  }
}

export class SelectPlugin implements CADPlugin {
  public id = 'core-select';
  public name = 'Selection Engine';
  public version = '1.0.0';
  public category: 'utility' = 'utility';

  public init(core: CADCoreAPI): void {
    const tool = new SelectTool();
    core.registerTool(tool);
    core.setActiveTool(tool.id);
  }

  public destroy(): void {}
}
