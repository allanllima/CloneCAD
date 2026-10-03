import {
  CADCoreAPI,
  CADPlugin,
  CADPointerEvent,
  CADTool,
  TextEntity,
} from '../../core/types';
import { AddEntityCommand } from '../../commands/AddEntityCommand';

export class TextTool implements CADTool {
  public id = 'text';
  public name = 'Text';
  public category: 'annotation' = 'annotation';
  public cursor = 'text';
  public shortcut = 'T';

  private core: CADCoreAPI | null = null;

  public onActivate(core: CADCoreAPI): void {
    this.core = core;
    this.core.setPrompt('TEXT Specify start point of text:');
  }

  public onDeactivate(core: CADCoreAPI): void {
    this.cancel();
  }

  public onPointerDown(e: CADPointerEvent): void {
    if (!this.core || e.button !== 0) return;

    const userInput = window.prompt('Enter CAD text:', 'AutoCAD 2026');
    if (userInput) {
      const textEntity: TextEntity = {
        id: `text_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: 'text',
        layerId: this.core.getActiveLayer().id,
        position: { ...e.world },
        text: userInput,
        fontSize: 16,
        visible: true,
      };

      this.core.executeCommand(new AddEntityCommand(this.core, textEntity));
    }

    this.cancel();
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

export class TextPlugin implements CADPlugin {
  public id = 'annotation-text';
  public name = 'Text Tool';
  public version = '1.0.0';
  public category: 'annotation' = 'annotation';

  public init(core: CADCoreAPI): void {
    core.registerTool(new TextTool());
  }

  public destroy(): void {}
}
