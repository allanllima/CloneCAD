import {
  CADBlockDefinition,
  CADCoreAPI,
  CADEntity,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  Point2D,
  BlockReferenceEntity,
} from '../../core/types';
import { DeleteEntityCommand } from '../../commands/DeleteEntityCommand';
import { AddEntityCommand } from '../../commands/AddEntityCommand';
import { CompositeCommand } from '../../commands/CompositeCommand';

export class BlockTool implements CADTool {
  public id = 'block';
  public name = 'Block';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'B';

  private core: CADCoreAPI | null = null;
  private step: 'select_objects' | 'pick_base' = 'select_objects';
  private selectedEntities: CADEntity[] = [];
  private blockName: string = '';

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.selectedEntities = core.getSelectedEntities();

    // Trigger UI Block Creation Modal if listener exists
    this.core.emit('block:open_create_modal' as any);

    if (this.selectedEntities.length === 0) {
      this.step = 'select_objects';
      this.core.setPrompt('BLOCK Select objects to convert to block:');
    } else {
      this.step = 'pick_base';
      this.blockName = `BLOCK_${Date.now().toString().slice(-4)}`;
      this.core.setPrompt(`BLOCK [${this.blockName}] Specify insertion base point:`);
    }
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    if (this.step === 'select_objects') {
      const selectionMgr = (this.core as any).getSelectionManager();
      const tol = 8 / this.core.getViewport().zoom;
      const clicked = selectionMgr.pickEntity(this.core.getEntities(), e.world, tol);
      if (clicked) {
        this.selectedEntities = [clicked];
        this.core.selectEntities([clicked.id], false);
        this.step = 'pick_base';
        this.blockName = `BLOCK_${Date.now().toString().slice(-4)}`;
        this.core.setPrompt(`BLOCK [${this.blockName}] Specify insertion base point:`);
      }
    } else if (this.step === 'pick_base') {
      this.createBlockFromSelection(this.blockName, e.world, this.selectedEntities);
      this.cancel();
    }
  }

  public onPointerMove(e: CADPointerEvent): void {}
  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    this.selectedEntities = [];
    this.step = 'select_objects';
    if (this.core) {
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }

  /**
   * Defines a block from given entities and base point,
   * replacing original entities with a single block reference.
   */
  public createBlockFromSelection(
    name: string,
    basePoint: Point2D,
    entities: CADEntity[],
    convert = true
  ): void {
    if (!this.core || entities.length === 0) return;

    // 1. Create Block Definition
    const def: CADBlockDefinition = {
      id: `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: name.trim().toUpperCase(),
      basePoint: { ...basePoint },
      entities: JSON.parse(JSON.stringify(entities)),
      attributes: [],
      category: 'custom',
    };

    this.core.registerBlockDefinition(def);

    if (convert) {
      // 2. Replace original entities with an instance of the newly defined block
      const deleteCommands = entities.map((ent) => new DeleteEntityCommand(this.core!, ent));

      const instance: BlockReferenceEntity = {
        id: `block_ref_${Date.now()}`,
        type: 'insert',
        blockName: def.name,
        layerId: this.core.getActiveLayer().id,
        position: { ...basePoint },
        scale: { x: 1, y: 1 },
        rotation: 0,
        attributeValues: {},
        visible: true,
      };

      const addCommand = new AddEntityCommand(this.core, instance);
      const composite = new CompositeCommand(
        [...deleteCommands, addCommand],
        `CREATE BLOCK ${def.name}`
      );
      this.core.executeCommand(composite);
      this.core.selectEntities([instance.id], false);
    }

    this.core.logCommandMessage(`Block "${def.name}" created with ${entities.length} entities.`);
  }
}

export class BlockPlugin implements CADPlugin {
  public id = 'block-create';
  public name = 'Block Definition Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new BlockTool());
  }

  public destroy(): void {}
}
