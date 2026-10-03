import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  BlockReferenceEntity,
  Point2D,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class InsertTool implements CADTool {
  public id = 'insert';
  public name = 'Insert Block';
  public category: 'draw' = 'draw';
  public cursor = 'crosshair';
  public shortcut = 'I';

  private core: CADCoreAPI | null = null;
  private currentBlockName: string = 'DOOR_80';
  private scale: { x: number; y: number } = { x: 1, y: 1 };
  private rotation: number = 0; // in radians
  private customAttributes: Record<string, string> = {};

  public setBlockName(name: string): void {
    this.currentBlockName = name.toUpperCase();
    if (this.core) {
      this.core.setPrompt(`INSERT [${this.currentBlockName}] Specify insertion point:`);
    }
  }

  public setScale(x: number, y: number): void {
    this.scale = { x, y };
  }

  public setRotation(rad: number): void {
    this.rotation = rad;
  }

  public setAttributes(attrs: Record<string, string>): void {
    this.customAttributes = { ...attrs };
  }

  public onActivate(core: CADCoreAPI): void {
    this.core = core;

    // Default to first available block if DOOR_80 doesn't exist
    if (!core.hasBlockDefinition(this.currentBlockName)) {
      const all = core.getBlockDefinitions();
      if (all.length > 0) {
        this.currentBlockName = all[0].name;
      }
    }

    this.core.setPrompt(`INSERT [${this.currentBlockName}] Specify insertion point or select block:`);
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const blockMgr = (this.core as any).getBlockManager();
    const ref = blockMgr.instantiateBlock(this.currentBlockName, e.world, {
      scale: this.scale,
      rotation: this.rotation,
      layerId: this.core.getActiveLayer().id,
      attributes: this.customAttributes,
    });

    if (ref) {
      this.core.executeCommand(new AddEntityCommand(this.core, ref, `INSERT ${this.currentBlockName}`));
      this.core.setPreviewEntity(null);
      this.core.logCommandMessage(`Inserted block "${this.currentBlockName}" at (${e.world.x.toFixed(2)}, ${e.world.y.toFixed(2)}).`);

      const def = this.core.getBlockDefinition(this.currentBlockName);
      if (def && def.attributes && def.attributes.length > 0) {
        this.core.emit('block:open_attributes_modal' as any, ref);
      }
    }

    this.cancel();
  }

  public onPointerMove(e: CADPointerEvent): void {
    if (!this.core) return;

    const preview: BlockReferenceEntity = {
      id: 'preview_insert',
      type: 'insert',
      blockName: this.currentBlockName,
      layerId: this.core.getActiveLayer().id,
      position: { ...e.world },
      scale: this.scale,
      rotation: this.rotation,
      attributeValues: this.customAttributes,
      visible: true,
    };

    this.core.setPreviewEntity(preview);
  }

  public onPointerUp(e: CADPointerEvent): void {}

  public cancel(): void {
    if (this.core) {
      this.core.setPreviewEntity(null);
      this.core.setPrompt('Command:');
      this.core.setActiveTool('select');
    }
  }
}

export class InsertPlugin implements CADPlugin {
  public id = 'block-insert';
  public name = 'Block Insertion Tool';
  public version = '1.0.0';
  public category: 'draw' = 'draw';

  public init(core: CADCoreAPI): void {
    core.registerTool(new InsertTool());
  }

  public destroy(): void {}
}
