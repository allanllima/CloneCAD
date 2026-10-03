import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
} from '../../core/types';
import { DeleteEntityCommand } from '../../commands/DeleteEntityCommand';

export class EraseTool implements CADTool {
  public id = 'erase';
  public name = 'Erase';
  public category: 'modify' = 'modify';
  public cursor = 'crosshair';
  public shortcut = 'E';

  private core: CADCoreAPI | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    const selected = core.getSelectedEntities();
    if (selected.length > 0) {
      core.executeCommand(new DeleteEntityCommand(core, selected));
      core.logCommandMessage(`ERASE: ${selected.length} object(s) deleted.`);
      this.cancel();
    } else {
      core.setPrompt('ERASE Select objects to erase:');
    }
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const selectionMgr = (this.core as any).getSelectionManager();
    const tol = 8 / this.core.getViewport().zoom;
    const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);

    if (clicked) {
      this.core.executeCommand(new DeleteEntityCommand(this.core, [clicked]));
      this.core.logCommandMessage(`ERASE: 1 object erased.`);
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class ErasePlugin implements CADPlugin {
  public id = 'modify-erase';
  public name = 'Erase Tool';
  public version = '1.0.0';
  public category: 'modify' = 'modify';

  public init(core: CADCoreAPI): void {
    core.registerTool(new EraseTool());
  }

  public destroy(): void {}
}
